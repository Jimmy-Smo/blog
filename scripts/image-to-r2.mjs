#!/usr/bin/env node
// 把本地图片压成 WebP 上传到 R2 图床, 输出可直接粘贴的 Markdown。
//
// 用法:
//   npm run img -- <article-slug> <图片...>
//   npm run img -- jvm/oom-diagnostics ~/Desktop/heapdump.png
//   → https://img.jimmy42x.com/images/2026/08/jvm/oom-diagnostics/heapdump.a1b2c3d4.webp
//
// 与手写 wrangler 命令相比, 这里多做了三件事:
//   1. 缩到 MAX_WIDTH 以内并转 WebP —— 原始截图动辄几 MB, 直接传是浪费。
//   2. 文件名带内容哈希 —— 图片带 immutable 缓存头, 同名覆盖在 CDN 过期前不会生效。
//      哈希让"改图"自动变成新 key, 同时让"重传同一张图"天然幂等。
//   3. 上传后回读公开 URL 校验 —— 确认真的写到了线上而不是本地模拟存储。
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

import { IMAGE_HOST } from '../src/consts.ts';

const BUCKET = 'blog-assets';
const QUALITY = 82; // 82 对截图和照片都够用
const MAX_WIDTH = 1600; // 博客正文宽 720px, 2x 屏也用不到更大

const [slug, ...images] = process.argv.slice(2);

if (!slug || images.length === 0) {
	console.error('用法: npm run img -- <article-slug> <图片...>');
	console.error('例如: npm run img -- jvm/oom-diagnostics ~/Desktop/heap.png');
	process.exit(1);
}

const now = new Date();
const prefix = `images/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${slug}`;
const work = mkdtempSync(join(tmpdir(), 'img-r2-'));

try {
	const results = [];

	for (const src of images) {
		if (!existsSync(src)) {
			console.error(`跳过: ${src} 不存在`);
			continue;
		}

		const name = basename(src, extname(src));
		const meta = await sharp(src).metadata();

		// withoutEnlargement: 小图保持原尺寸, 不要放大糊掉
		const buf = await sharp(src)
			.resize({ width: MAX_WIDTH, withoutEnlargement: true })
			.webp({ quality: QUALITY, effort: 6 })
			.toBuffer();

		const hash = createHash('sha256').update(buf).digest('hex').slice(0, 8);
		const file = `${name}.${hash}.webp`;
		const key = `${prefix}/${file}`;
		const local = join(work, file);
		writeFileSync(local, buf);

		const before = statSync(src).size;
		const pct = before ? ` (-${Math.round((1 - buf.length / before) * 100)}%)` : '';
		console.log(
			`==> ${basename(src)}  ${meta.width}×${meta.height} → ` +
				`${Math.min(meta.width ?? 0, MAX_WIDTH)}px, ` +
				`${(before / 1024).toFixed(0)}KB → ${(buf.length / 1024).toFixed(0)}KB${pct}`,
		);

		// --remote 必须加: 不加的话 wrangler 只写本地模拟存储, 线上什么都没有。
		// env -u all_proxy: wrangler 的 undici 不认 socks5 代理, 会直接 fetch failed。
		execFileSync(
			'env',
			[
				'-u',
				'all_proxy',
				'npx',
				'wrangler',
				'r2',
				'object',
				'put',
				`${BUCKET}/${key}`,
				`--file=${local}`,
				'--content-type=image/webp',
				'--cache-control=public, max-age=31536000, immutable',
				'--remote',
			],
			{ stdio: ['ignore', 'ignore', 'inherit'] },
		);

		const url = `${IMAGE_HOST}/${key}`;
		const res = await fetch(url, { method: 'HEAD' });
		if (!res.ok) {
			console.error(`    ⚠ 上传后回读失败: ${res.status} ${url}`);
		}
		results.push({ name, url });
		console.log(`    ✓ ${url}`);
	}

	if (results.length > 0) {
		console.log('\n==> 可直接粘贴到文章:\n');
		for (const { name, url } of results) console.log(`![${name}](${url})`);
	}
} finally {
	rmSync(work, { recursive: true, force: true });
}
