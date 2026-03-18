"""
PicManager Python SDK — 供 AI Agent 调用的图床管理工具

使用方法:
    from picmanager import PicManager

    pm = PicManager(
        worker_url="https://my-picbed.your-account.workers.dev",
        auth_token="your-auth-token",
        custom_domain="https://img.example.com"  # 可选
    )

    # 从 URL 抓图上传
    result = pm.upload_from_url("https://example.com/photo.jpg", folder="blog-post")
    print(result["url"])  # https://img.example.com/blog-post/photo.jpg

    # 从本地文件上传
    result = pm.upload_file("/path/to/image.png", folder="avatars")

    # 从 base64 上传
    result = pm.upload_base64(b64_string, filename="chart.png", folder="reports")

    # 列出所有图片
    images = pm.list_all()

    # 列出某文件夹
    images = pm.list_folder("blog-post/")

    # 重命名 / 移动
    pm.rename("old-key.png", "new-key.png")
    pm.move("blog/old.png", "archive/")

    # 删除
    pm.delete("some-image.png")

    # 获取公开访问 URL
    url = pm.url("blog-post/photo.jpg")
    md  = pm.markdown("blog-post/photo.jpg", alt="照片")

依赖: requests (pip install requests)
"""

import requests
import base64
import os
from typing import Optional
from urllib.parse import quote


class PicManager:
    def __init__(
        self,
        worker_url: str = "",
        auth_token: str = "",
        custom_domain: str = "",
    ):
        self.worker_url = worker_url.rstrip("/")
        self.auth_token = auth_token
        self.custom_domain = custom_domain.rstrip("/") if custom_domain else ""

        if not self.worker_url or not self.auth_token:
            raise ValueError("worker_url 和 auth_token 不能为空")

    def _headers(self, json_mode=False):
        h = {"X-Auth-Token": self.auth_token}
        if json_mode:
            h["Content-Type"] = "application/json"
        return h

    def _base_url(self):
        return self.custom_domain or self.worker_url

    # ========== 链接生成 ==========

    def url(self, key: str) -> str:
        """获取图片的公开访问 URL"""
        return f"{self._base_url()}/{key}"

    def markdown(self, key: str, alt: str = "") -> str:
        """获取 Markdown 格式的图片引用"""
        alt = alt or key.split("/")[-1]
        return f"![{alt}]({self.url(key)})"

    def html_tag(self, key: str, alt: str = "") -> str:
        """获取 HTML img 标签"""
        alt = alt or key.split("/")[-1]
        return f'<img src="{self.url(key)}" alt="{alt}">'

    # ========== 上传 ==========

    def upload_from_url(
        self,
        image_url: str,
        filename: Optional[str] = None,
        folder: str = "",
    ) -> dict:
        """
        从 URL 抓取图片并上传到图床

        Args:
            image_url: 图片的 URL
            filename: 保存的文件名（不含路径），为空则自动生成
            folder: 目标文件夹，如 "blog-post" 或 "blog-post/"

        Returns:
            {"key": "blog-post/photo.jpg", "url": "https://..."}
        """
        payload = {"url": image_url}
        if filename:
            payload["filename"] = filename
        if folder:
            payload["folder"] = folder

        resp = requests.post(
            self.worker_url,
            json=payload,
            headers=self._headers(json_mode=True),
        )
        resp.raise_for_status()
        data = resp.json()
        data["url"] = self.url(data["key"])
        return data

    def upload_base64(
        self,
        b64_data: str,
        filename: Optional[str] = None,
        folder: str = "",
        content_type: str = "image/png",
    ) -> dict:
        """
        上传 base64 编码的图片

        Args:
            b64_data: base64 字符串（不含 data:image/...;base64, 前缀）
            filename: 文件名
            folder: 目标文件夹
            content_type: MIME 类型

        Returns:
            {"key": "...", "url": "https://..."}
        """
        # 去掉可能的 data URL 前缀
        if "," in b64_data and b64_data.startswith("data:"):
            parts = b64_data.split(",", 1)
            b64_data = parts[1]
            if ":" in parts[0] and ";" in parts[0]:
                content_type = parts[0].split(":")[1].split(";")[0]

        payload = {"base64": b64_data, "contentType": content_type}
        if filename:
            payload["filename"] = filename
        if folder:
            payload["folder"] = folder

        resp = requests.post(
            self.worker_url,
            json=payload,
            headers=self._headers(json_mode=True),
        )
        resp.raise_for_status()
        data = resp.json()
        data["url"] = self.url(data["key"])
        return data

    def upload_file(
        self,
        file_path: str,
        filename: Optional[str] = None,
        folder: str = "",
    ) -> dict:
        """
        上传本地文件

        Args:
            file_path: 本地文件路径
            filename: 保存的文件名，为空则用原文件名
            folder: 目标文件夹

        Returns:
            {"key": "...", "url": "https://..."}
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        with open(file_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()

        ext = os.path.splitext(file_path)[1].lower()
        ct_map = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".gif": "image/gif",
            ".webp": "image/webp", ".avif": "image/avif",
            ".svg": "image/svg+xml",
        }
        content_type = ct_map.get(ext, "image/png")
        fname = filename or os.path.basename(file_path)

        return self.upload_base64(b64, filename=fname, folder=folder, content_type=content_type)

    def upload_bytes(
        self,
        data: bytes,
        filename: str,
        folder: str = "",
        content_type: str = "image/png",
    ) -> dict:
        """上传原始字节数据"""
        b64 = base64.b64encode(data).decode()
        return self.upload_base64(b64, filename=filename, folder=folder, content_type=content_type)

    # ========== 列表 ==========

    def list_all(self) -> list[dict]:
        """列出所有图片（扁平列表）"""
        resp = requests.get(
            f"{self.worker_url}/list",
            headers=self._headers(),
        )
        resp.raise_for_status()
        items = resp.json()
        for item in items:
            item["url"] = self.url(item["key"])
        return items

    def list_folder(self, folder: str = "") -> dict:
        """
        列出某文件夹下的文件和子文件夹

        Returns:
            {"files": [...], "folders": [...], "prefix": "..."}
        """
        params = {"prefix": folder, "delimiter": "/"}
        resp = requests.get(
            f"{self.worker_url}/list",
            params=params,
            headers=self._headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        for f in data.get("files", []):
            f["url"] = self.url(f["key"])
        return data

    def search(self, keyword: str) -> list[dict]:
        """按关键词搜索文件名"""
        all_images = self.list_all()
        keyword_lower = keyword.lower()
        return [img for img in all_images if keyword_lower in img["key"].lower()]

    def list_folders(self) -> list[str]:
        """列出所有文件夹"""
        all_images = self.list_all()
        folders = set()
        for img in all_images:
            parts = img["key"].split("/")
            if len(parts) > 1:
                for i in range(1, len(parts)):
                    folders.add("/".join(parts[:i]) + "/")
        return sorted(folders)

    # ========== 管理 ==========

    def rename(self, old_key: str, new_key: str) -> dict:
        """重命名文件"""
        resp = requests.put(
            f"{self.worker_url}/rename",
            json={"oldKey": old_key, "newKey": new_key},
            headers=self._headers(json_mode=True),
        )
        resp.raise_for_status()
        data = resp.json()
        data["url"] = self.url(data["key"])
        return data

    def move(self, key: str, target_folder: str) -> dict:
        """移动文件到指定文件夹"""
        if not target_folder.endswith("/"):
            target_folder += "/"
        filename = key.split("/")[-1]
        new_key = target_folder + filename
        return self.rename(key, new_key)

    def delete(self, key: str) -> dict:
        """删除文件"""
        resp = requests.delete(
            f"{self.worker_url}/{quote(key, safe='')}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    def delete_folder(self, folder: str) -> dict:
        """删除整个文件夹（含所有文件）"""
        if not folder.endswith("/"):
            folder += "/"
        all_images = self.list_all()
        to_delete = [img for img in all_images if img["key"].startswith(folder)]
        results = {"deleted": 0, "failed": 0}
        for img in to_delete:
            try:
                self.delete(img["key"])
                results["deleted"] += 1
            except Exception:
                results["failed"] += 1
        return results

    # ========== 便捷方法 ==========

    def exists(self, key: str) -> bool:
        """检查文件是否存在"""
        resp = requests.get(f"{self.worker_url}/{quote(key, safe='/')}")
        return resp.status_code == 200

    def info(self) -> dict:
        """获取图床统计信息"""
        all_images = self.list_all()
        total_size = sum(img.get("size", 0) for img in all_images)
        folders = self.list_folders()
        return {
            "total_files": len(all_images),
            "total_size": total_size,
            "total_size_human": self._format_size(total_size),
            "folders": folders,
            "folder_count": len(folders),
        }

    @staticmethod
    def _format_size(size_bytes):
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"


# ========== 快捷函数（可直接 import 使用） ==========

_default_instance = None

def init(worker_url: str, auth_token: str, custom_domain: str = ""):
    """初始化默认实例"""
    global _default_instance
    _default_instance = PicManager(worker_url, auth_token, custom_domain)
    return _default_instance

def _get_instance():
    if not _default_instance:
        raise RuntimeError("请先调用 picmanager.init(...)")
    return _default_instance

def upload(source: str, filename: str = "", folder: str = "") -> dict:
    """
    智能上传：自动判断 source 类型
    - 以 http 开头 → 从 URL 抓取
    - 以 data: 开头 → base64
    - 其他 → 当作本地文件路径
    """
    pm = _get_instance()
    if source.startswith(("http://", "https://")):
        return pm.upload_from_url(source, filename=filename, folder=folder)
    elif source.startswith("data:"):
        return pm.upload_base64(source, filename=filename, folder=folder)
    else:
        return pm.upload_file(source, filename=filename, folder=folder)
