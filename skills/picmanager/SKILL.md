---
name: picmanager
description: 管理图床——上传、列出、搜索、重命名、移动、删除图片，获取图片链接。
---

# PicManager — 图床管理技能

你可以通过此技能管理用户的 Cloudflare R2 图床。

## 使用方法

通过 system.run 调用 CLI 工具：

```bash
(cd ~/.openclaw/workspace/skills/picmanager && set -a && source .env && set +a && node cli.mjs <command>)
```

### 可用命令

- `upload-url <url> [--folder <f>]` — 从 URL 抓图上传
- `upload-file <path> [--folder <f>]` — 上传本地文件
- `list` — 列出所有图片
- `list-folder [path]` — 列出文件夹内容（含子文件夹）
- `search <keyword>` — 搜索图片
- `rename <old-key> <new-key>` — 重命名
- `move <key> <folder>` — 移动文件到文件夹
- `delete <key>` — 删除文件
- `url <key>` — 获取访问链接
- `markdown <key> [alt]` — 获取 Markdown 引用
- `info` — 获取图床统计（文件数、总大小、文件夹列表）

### 示例

```bash
# 上传一张图片到 blog 文件夹
node cli.mjs upload-url https://example.com/photo.jpg --folder blog

# 获取 Markdown 引用
node cli.mjs markdown blog/photo.jpg "博客配图"
# 输出: ![博客配图](https://img.example.com/blog/photo.jpg)

# 查看统计
node cli.mjs info
```

## 配置

配置保存在 `.env` 文件中（不进版本控制）：

```bash
PICMANAGER_WORKER_URL=https://my-picbed.your-account.workers.dev
PICMANAGER_AUTH_TOKEN=your-auth-token
PICMANAGER_CUSTOM_DOMAIN=https://img.example.com
```
