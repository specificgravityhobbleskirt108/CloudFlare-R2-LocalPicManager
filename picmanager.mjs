/**
 * PicManager Node.js SDK
 *
 * 供 OpenClaw 等 Node.js AI Agent 使用的图床管理模块。
 *
 * 用法:
 *   import { PicManager } from './picmanager.mjs';
 *   const pm = new PicManager({
 *     workerUrl: 'https://my-picbed.your-account.workers.dev',
 *     authToken: 'your-auth-token',
 *     customDomain: 'https://img.example.com'  // 可选
 *   });
 *
 *   // 从 URL 抓图
 *   const r = await pm.uploadFromUrl('https://example.com/photo.jpg', { folder: 'blog' });
 *   console.log(r.url);
 *
 * 零依赖，仅使用 Node.js 内置 fetch API (Node 18+)。
 */

export class PicManager {
  constructor({ workerUrl, authToken, customDomain = '' }) {
    if (!workerUrl || !authToken) throw new Error('workerUrl 和 authToken 不能为空');
    this.workerUrl = workerUrl.replace(/\/+$/, '');
    this.authToken = authToken;
    this.customDomain = customDomain.replace(/\/+$/, '');
  }

  /** 获取图片公开 URL */
  url(key) {
    const base = this.customDomain || this.workerUrl;
    return `${base}/${key}`;
  }

  /** 获取 Markdown 图片引用 */
  markdown(key, alt = '') {
    return `![${alt || key.split('/').pop()}](${this.url(key)})`;
  }

  /** 获取 HTML img 标签 */
  htmlTag(key, alt = '') {
    return `<img src="${this.url(key)}" alt="${alt || key.split('/').pop()}">`;
  }

  // ===== 上传 =====

  /**
   * 从 URL 抓取图片并上传
   * @param {string} imageUrl - 图片 URL
   * @param {object} opts - { filename, folder }
   */
  async uploadFromUrl(imageUrl, { filename, folder } = {}) {
    const body = { url: imageUrl };
    if (filename) body.filename = filename;
    if (folder) body.folder = folder;
    const res = await this._jsonPost(body);
    res.url = this.url(res.key);
    return res;
  }

  /**
   * 上传 base64 编码的图片
   * @param {string} b64 - base64 字符串
   * @param {object} opts - { filename, folder, contentType }
   */
  async uploadBase64(b64, { filename, folder, contentType = 'image/png' } = {}) {
    // 处理 data URL 前缀
    if (b64.startsWith('data:')) {
      const [prefix, data] = b64.split(',', 2);
      b64 = data;
      const match = prefix.match(/data:([^;]+)/);
      if (match) contentType = match[1];
    }
    const body = { base64: b64, contentType };
    if (filename) body.filename = filename;
    if (folder) body.folder = folder;
    const res = await this._jsonPost(body);
    res.url = this.url(res.key);
    return res;
  }

  /**
   * 上传本地文件（Node.js 环境）
   * @param {string} filePath - 本地文件路径
   * @param {object} opts - { filename, folder }
   */
  async uploadFile(filePath, { filename, folder } = {}) {
    const { readFileSync, existsSync } = await import('fs');
    const { basename, extname } = await import('path');
    if (!existsSync(filePath)) throw new Error(`文件不存在: ${filePath}`);

    const data = readFileSync(filePath);
    const b64 = data.toString('base64');
    const ext = extname(filePath).toLowerCase();
    const ctMap = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
      '.svg': 'image/svg+xml',
    };
    return this.uploadBase64(b64, {
      filename: filename || basename(filePath),
      folder,
      contentType: ctMap[ext] || 'image/png',
    });
  }

  /**
   * 上传 Buffer
   * @param {Buffer} buffer
   * @param {string} filename
   * @param {object} opts - { folder, contentType }
   */
  async uploadBuffer(buffer, filename, { folder, contentType = 'image/png' } = {}) {
    const b64 = buffer.toString('base64');
    return this.uploadBase64(b64, { filename, folder, contentType });
  }

  // ===== 列表 =====

  /** 列出所有图片 */
  async listAll() {
    const items = await this._get('/list');
    for (const item of items) item.url = this.url(item.key);
    return items;
  }

  /** 列出某文件夹下的文件和子文件夹 */
  async listFolder(folder = '') {
    const data = await this._get(`/list?prefix=${encodeURIComponent(folder)}&delimiter=/`);
    for (const f of (data.files || [])) f.url = this.url(f.key);
    return data;
  }

  /** 搜索文件名 */
  async search(keyword) {
    const all = await this.listAll();
    const kw = keyword.toLowerCase();
    return all.filter(img => img.key.toLowerCase().includes(kw));
  }

  /** 列出所有文件夹 */
  async listFolders() {
    const all = await this.listAll();
    const folders = new Set();
    for (const img of all) {
      const parts = img.key.split('/');
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          folders.add(parts.slice(0, i).join('/') + '/');
        }
      }
    }
    return [...folders].sort();
  }

  // ===== 管理 =====

  /** 重命名文件 */
  async rename(oldKey, newKey) {
    const res = await fetch(`${this.workerUrl}/rename`, {
      method: 'PUT',
      headers: { 'X-Auth-Token': this.authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldKey, newKey }),
    });
    if (!res.ok) throw new Error(`Rename failed: ${await res.text()}`);
    const data = await res.json();
    data.url = this.url(data.key);
    return data;
  }

  /** 移动文件到指定文件夹 */
  async move(key, targetFolder) {
    if (!targetFolder.endsWith('/')) targetFolder += '/';
    const filename = key.split('/').pop();
    return this.rename(key, targetFolder + filename);
  }

  /** 删除文件 */
  async delete(key) {
    const res = await fetch(`${this.workerUrl}/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': this.authToken },
    });
    if (!res.ok) throw new Error(`Delete failed: ${await res.text()}`);
    return res.json();
  }

  /** 删除整个文件夹 */
  async deleteFolder(folder) {
    if (!folder.endsWith('/')) folder += '/';
    const all = await this.listAll();
    const toDelete = all.filter(img => img.key.startsWith(folder));
    let deleted = 0, failed = 0;
    for (const img of toDelete) {
      try { await this.delete(img.key); deleted++; } catch { failed++; }
    }
    return { deleted, failed };
  }

  /** 检查文件是否存在 */
  async exists(key) {
    const res = await fetch(`${this.workerUrl}/${encodeURIComponent(key)}`);
    return res.ok;
  }

  /** 获取图床统计信息 */
  async info() {
    const all = await this.listAll();
    const totalSize = all.reduce((sum, img) => sum + (img.size || 0), 0);
    const folders = await this.listFolders();
    return {
      totalFiles: all.length,
      totalSize,
      totalSizeHuman: this._formatSize(totalSize),
      folders,
      folderCount: folders.length,
    };
  }

  // ===== 内部方法 =====

  async _get(path) {
    const res = await fetch(`${this.workerUrl}${path}`, {
      headers: { 'X-Auth-Token': this.authToken },
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  }

  async _jsonPost(body) {
    const res = await fetch(this.workerUrl, {
      method: 'POST',
      headers: { 'X-Auth-Token': this.authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST failed: ${await res.text()}`);
    return res.json();
  }

  _formatSize(bytes) {
    for (const unit of ['B', 'KB', 'MB', 'GB']) {
      if (bytes < 1024) return `${bytes.toFixed(1)} ${unit}`;
      bytes /= 1024;
    }
    return `${bytes.toFixed(1)} TB`;
  }
}

export default PicManager;
