#!/usr/bin/env node
/**
 * PicManager CLI — 供 OpenClaw Agent 调用的命令行工具
 *
 * 用法: node cli.mjs <command> [args...]
 *
 * 配置通过环境变量传入（见 .env 文件）：
 *   PICMANAGER_WORKER_URL
 *   PICMANAGER_AUTH_TOKEN
 *   PICMANAGER_CUSTOM_DOMAIN  （可选）
 */

import { PicManager } from './picmanager.mjs';

const [,, cmd, ...args] = process.argv;

function getPM() {
  const workerUrl = process.env.PICMANAGER_WORKER_URL;
  const authToken = process.env.PICMANAGER_AUTH_TOKEN;
  if (!workerUrl || !authToken) {
    console.error(JSON.stringify({ error: '缺少环境变量：PICMANAGER_WORKER_URL 或 PICMANAGER_AUTH_TOKEN' }));
    process.exit(1);
  }
  return new PicManager({
    workerUrl,
    authToken,
    customDomain: process.env.PICMANAGER_CUSTOM_DOMAIN || '',
  });
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      flags[args[i].slice(2)] = args[++i];
    } else {
      positional.push(args[i]);
    }
  }
  return { flags, positional };
}

async function main() {
  const pm = getPM();

  switch (cmd) {
    case 'upload-url': {
      const { flags, positional } = parseFlags(args);
      if (!positional[0]) { console.error('用法: upload-url <url> [--folder <f>] [--filename <name>]'); process.exit(1); }
      const result = await pm.uploadFromUrl(positional[0], { folder: flags.folder, filename: flags.filename });
      console.log(JSON.stringify(result));
      break;
    }

    case 'upload-file': {
      const { flags, positional } = parseFlags(args);
      if (!positional[0]) { console.error('用法: upload-file <path> [--folder <f>] [--filename <name>]'); process.exit(1); }
      const result = await pm.uploadFile(positional[0], { folder: flags.folder, filename: flags.filename });
      console.log(JSON.stringify(result));
      break;
    }

    case 'list': {
      const items = await pm.listAll();
      console.log(JSON.stringify(items));
      break;
    }

    case 'list-folder': {
      const folder = args[0] || '';
      const data = await pm.listFolder(folder);
      console.log(JSON.stringify(data));
      break;
    }

    case 'search': {
      if (!args[0]) { console.error('用法: search <keyword>'); process.exit(1); }
      const results = await pm.search(args[0]);
      console.log(JSON.stringify(results));
      break;
    }

    case 'rename': {
      if (!args[0] || !args[1]) { console.error('用法: rename <old-key> <new-key>'); process.exit(1); }
      const result = await pm.rename(args[0], args[1]);
      console.log(JSON.stringify(result));
      break;
    }

    case 'move': {
      if (!args[0] || !args[1]) { console.error('用法: move <key> <folder>'); process.exit(1); }
      const result = await pm.move(args[0], args[1]);
      console.log(JSON.stringify(result));
      break;
    }

    case 'delete': {
      if (!args[0]) { console.error('用法: delete <key>'); process.exit(1); }
      const result = await pm.delete(args[0]);
      console.log(JSON.stringify(result));
      break;
    }

    case 'url': {
      if (!args[0]) { console.error('用法: url <key>'); process.exit(1); }
      console.log(JSON.stringify({ url: pm.url(args[0]) }));
      break;
    }

    case 'markdown': {
      if (!args[0]) { console.error('用法: markdown <key> [alt]'); process.exit(1); }
      console.log(JSON.stringify({ markdown: pm.markdown(args[0], args[1] || '') }));
      break;
    }

    case 'info': {
      const result = await pm.info();
      console.log(JSON.stringify(result));
      break;
    }

    default:
      console.error(JSON.stringify({
        error: `未知命令: ${cmd || '(空)'}`,
        available: ['upload-url', 'upload-file', 'list', 'list-folder', 'search', 'rename', 'move', 'delete', 'url', 'markdown', 'info'],
      }));
      process.exit(1);
  }
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
