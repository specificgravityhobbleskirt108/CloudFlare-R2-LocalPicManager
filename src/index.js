export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice(1));

    // Worker 自身的公开 URL（用于响应中返回图片地址）
    const workerOrigin = env.CUSTOM_DOMAIN || url.origin;

    // GET 列表（支持文件夹浏览）
    // ?prefix=folder/  — 列出该文件夹下的内容
    // ?delimiter=/     — 按 / 分隔，返回子文件夹
    // ?all=1           — 列出所有文件（不分文件夹，兼容旧行为）
    if (request.method === "GET" && key === "list") {
      const authToken = request.headers.get("X-Auth-Token");
      if (authToken !== env.AUTH_TOKEN) return new Response("Unauthorized", { status: 401 });

      const prefix = url.searchParams.get("prefix") || "";
      const delimiter = url.searchParams.get("delimiter") || "";
      const all = url.searchParams.get("all");

      // 兼容旧行为：无参数或 all=1 时列出所有文件
      if (all === "1" || (!prefix && !delimiter)) {
        const list = await env.BUCKET.list();
        const items = list.objects.map(o => ({
          key: o.key,
          size: o.size,
          uploaded: o.uploaded,
        }));
        return new Response(JSON.stringify(items), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 文件夹浏览模式
      const listOpts = {};
      if (prefix) listOpts.prefix = prefix;
      if (delimiter) listOpts.delimiter = delimiter;

      const list = await env.BUCKET.list(listOpts);
      const files = list.objects.map(o => ({
        key: o.key,
        size: o.size,
        uploaded: o.uploaded,
      }));
      // delimitedPrefixes 是子文件夹列表
      const folders = list.delimitedPrefixes || [];

      return new Response(JSON.stringify({ files, folders, prefix }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET 图片
    if (request.method === "GET" && key) {
      // 防盗链检查
      // 在 allowedHosts 里填入你自己允许引用图片的域名
      // 留空数组 [] 则完全关闭防盗链
      const allowedHosts = [
        // "example.com",
        // "blog.example.com",
        "localhost",
        "127.0.0.1",
      ];

      const referer = request.headers.get("Referer");
      if (referer && allowedHosts.length > 0) {
        try {
          const refHost = new URL(referer).hostname;
          if (!allowedHosts.some(h => refHost === h || refHost.endsWith("." + h))) {
            return new Response("Forbidden", { status: 403, headers: corsHeaders });
          }
        } catch {
          return new Response("Forbidden", { status: 403, headers: corsHeaders });
        }
      }

      const object = await env.BUCKET.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "image/png",
          "Cache-Control": "public, max-age=31536000",
          ...corsHeaders,
        },
      });
    }

    // DELETE 图片
    if (request.method === "DELETE" && key) {
      const authToken = request.headers.get("X-Auth-Token");
      if (authToken !== env.AUTH_TOKEN) return new Response("Unauthorized", { status: 401 });
      await env.BUCKET.delete(key);
      return new Response(JSON.stringify({ deleted: key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT 重命名 / 移动
    if (request.method === "PUT" && key === "rename") {
      const authToken = request.headers.get("X-Auth-Token");
      if (authToken !== env.AUTH_TOKEN) return new Response("Unauthorized", { status: 401 });
      const { oldKey, newKey } = await request.json();
      if (!oldKey || !newKey) return new Response("Missing oldKey or newKey", { status: 400 });
      if (oldKey === newKey) return new Response(JSON.stringify({ key: newKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const object = await env.BUCKET.get(oldKey);
      if (!object) return new Response("Source not found", { status: 404 });
      await env.BUCKET.put(newKey, object.body, {
        httpMetadata: object.httpMetadata,
      });
      await env.BUCKET.delete(oldKey);
      return new Response(JSON.stringify({ key: newKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST 上传
    // 支持三种模式：
    //   1. formData (file + path)          — 前端用
    //   2. JSON { url, filename, folder }  — AI Agent 从 URL 抓图
    //   3. JSON { base64, filename, folder, contentType } — AI Agent base64 上传
    if (request.method === "POST") {
      const authToken = request.headers.get("X-Auth-Token");
      if (authToken !== env.AUTH_TOKEN) return new Response("Unauthorized", { status: 401 });

      const ct = request.headers.get("Content-Type") || "";

      // JSON 模式（AI Agent）
      if (ct.includes("application/json")) {
        const body = await request.json();

        // 从 URL 抓图上传
        if (body.url) {
          try {
            const imgRes = await fetch(body.url);
            if (!imgRes.ok) return new Response(`Failed to fetch: ${imgRes.status}`, { status: 400, headers: corsHeaders });
            const imgContentType = imgRes.headers.get("Content-Type") || "image/png";
            const imgData = await imgRes.arrayBuffer();
            const folder = body.folder ? (body.folder.endsWith("/") ? body.folder : body.folder + "/") : "";
            const ext = imgContentType.split("/")[1]?.replace("jpeg", "jpg") || "png";
            const filename = body.filename || `${Date.now()}.${ext}`;
            const k = `${folder}${filename}`;
            await env.BUCKET.put(k, imgData, { httpMetadata: { contentType: imgContentType } });
            return new Response(JSON.stringify({ key: k, url: `${workerOrigin}/${k}` }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } catch (e) {
            return new Response(`Fetch error: ${e.message}`, { status: 500, headers: corsHeaders });
          }
        }

        // Base64 上传
        if (body.base64) {
          try {
            const raw = atob(body.base64);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            const contentType = body.contentType || "image/png";
            const folder = body.folder ? (body.folder.endsWith("/") ? body.folder : body.folder + "/") : "";
            const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "png";
            const filename = body.filename || `${Date.now()}.${ext}`;
            const k = `${folder}${filename}`;
            await env.BUCKET.put(k, bytes.buffer, { httpMetadata: { contentType } });
            return new Response(JSON.stringify({ key: k, url: `${workerOrigin}/${k}` }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } catch (e) {
            return new Response(`Base64 error: ${e.message}`, { status: 400, headers: corsHeaders });
          }
        }

        return new Response("JSON body must include 'url' or 'base64'", { status: 400, headers: corsHeaders });
      }

      // FormData 模式（前端）
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) return new Response("No file", { status: 400 });
      const path = formData.get("path") || "";
      const filename = `${path}${Date.now()}-${file.name}`;
      await env.BUCKET.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      return new Response(JSON.stringify({ key: filename }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
