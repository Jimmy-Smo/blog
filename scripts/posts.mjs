#!/usr/bin/env node
// 文章发布工具。frontmatter 用行级正则改写而不是引 YAML 库:
// 模板的 frontmatter 结构固定, 这样能原样保留注释、缩进和字段顺序。
//
//   npm run post:list                              查看全部文章及发布状态
//   npm run post:new -- <topic/slug> "标题"         从模板新建
//   npm run post:publish -- <topic/slug>           draft:false + updated 改为今天
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT = join(ROOT, 'content');
const TEMPLATE = join(CONTENT, '_template.md');

const today = () => new Date().toISOString().slice(0, 10);

/** 递归收集 content/ 下的正式文章, 跳过 weekly、README 和下划线开头的模板。 */
function collect(dir = CONTENT, out = []) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) {
			if (name !== 'weekly') collect(p, out);
		} else if (/\.mdx?$/.test(name) && !name.startsWith('_') && name !== 'README.md') {
			out.push(p);
		}
	}
	return out;
}

const field = (src, key) => src.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';

function list() {
	const rows = collect()
		.map((p) => {
			const src = readFileSync(p, 'utf8');
			return {
				id: relative(CONTENT, p).replace(/\.mdx?$/, ''),
				draft: field(src, 'draft') === 'true',
				date: field(src, 'date'),
				status: field(src, 'status') || 'evergreen',
				title: field(src, 'title'),
			};
		})
		.sort((a, b) => Number(b.draft) - Number(a.draft) || b.date.localeCompare(a.date));

	const pub = rows.filter((r) => !r.draft).length;
	console.log(`\n${rows.length} 篇 · 已发布 ${pub} · 草稿 ${rows.length - pub}\n`);
	for (const r of rows) {
		const flag = r.draft ? '\x1b[33m草稿\x1b[0m' : '\x1b[32m已发布\x1b[0m';
		console.log(`  ${flag}  ${r.date}  ${r.id.padEnd(46)} ${r.title}`);
	}
	if (rows.length - pub > 0) {
		console.log(`\n发布某篇: npm run post:publish -- <topic/slug>`);
	}
	console.log();
}

function create(id, title) {
	if (!id || !title) {
		console.error('用法: npm run post:new -- <topic/slug> "标题"');
		process.exit(1);
	}
	const dest = join(CONTENT, `${id}.md`);
	if (existsSync(dest)) {
		console.error(`已存在: ${relative(ROOT, dest)}`);
		process.exit(1);
	}
	mkdirSync(dirname(dest), { recursive: true });

	const d = today();
	const src = readFileSync(TEMPLATE, 'utf8')
		.replace(/^title:.*$/m, `title: ${title}`)
		.replace(/^date:.*$/m, `date: ${d}`)
		.replace(/^updated:.*$/m, `updated: ${d}`)
		.replace(/^# 文档标题$/m, `# ${title}`);

	writeFileSync(dest, src);
	console.log(`已创建 ${relative(ROOT, dest)}`);
	console.log(`  写完后发布: npm run post:publish -- ${id}`);
}

function publish(id) {
	if (!id) {
		console.error('用法: npm run post:publish -- <topic/slug>');
		process.exit(1);
	}
	const dest = join(CONTENT, `${id}.md`);
	if (!existsSync(dest)) {
		console.error(`找不到: ${relative(ROOT, dest)}`);
		process.exit(1);
	}
	const src = readFileSync(dest, 'utf8');
	if (field(src, 'draft') === 'false') {
		console.log(`${id} 已是发布状态, 未改动。`);
		return;
	}

	writeFileSync(
		dest,
		src.replace(/^draft:.*$/m, 'draft: false').replace(/^updated:.*$/m, `updated: ${today()}`),
	);

	console.log(`${id} → draft: false, updated: ${today()}\n`);
	console.log('发布前请自检:');
	console.log('  [ ] 无密钥、内部信息、未脱敏数据');
	console.log('  [ ] 版本敏感内容已标注版本与核验日期');
	console.log('  [ ] 图片走 R2 图床 (npm run img)，无桌面绝对路径');
	console.log('\n然后: npm run build 验证 → 提交 → 合并到 main 自动部署');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'list') list();
else if (cmd === 'new') create(rest[0], rest.slice(1).join(' '));
else if (cmd === 'publish') publish(rest[0]);
else {
	console.error('用法: node scripts/posts.mjs <list|new|publish> [参数...]');
	process.exit(1);
}
