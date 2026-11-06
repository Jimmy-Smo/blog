import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { comparePostDates, formatPostDate, postTimestamp } from '../src/lib/post-dates.mjs';

const sort = (posts) => posts.sort((a, b) => comparePostDates(new Date(a.date), new Date(b.date), a.id, b.id));

test('同日按时分秒降序，带不同时区时按实际时刻比较', () => {
	const rows = [
		{ id: 'morning', date: '2026-11-06T09:00:00+08:00' },
		{ id: 'evening', date: '2026-11-06T23:25:49+08:00' },
		{ id: 'utc', date: '2026-11-06T13:02:19Z' },
		{ id: 'earlier-second', date: '2026-11-06T23:25:48+08:00' },
	];
	assert.deepEqual(sort(rows).map((p) => p.id), ['evening', 'earlier-second', 'utc', 'morning']);
});

test('完全相同的发布时间不依赖加载顺序，旧日期仍兼容', () => {
	const date = '2026-11-06T21:02:19+08:00';
	for (const ids of [['b', 'a'], ['a', 'b']]) {
		assert.deepEqual(sort(ids.map((id) => ({ id, date }))).map((p) => p.id), ['a', 'b']);
	}
	assert.deepEqual(sort([
		{ id: 'old', date: '2026-11-05' }, { id: 'new', date },
	]).map((p) => p.id), ['new', 'old']);
});

test('凌晨及跨年日期按站点时区显示，不落到前一天或上一年', () => {
	assert.equal(formatPostDate(new Date('2027-01-01T00:30:00+08:00')), '2027-01-01');
	assert.equal(formatPostDate(new Date('2026-11-06T00:00:01+08:00')), '2026-11-06');
	assert.equal(formatPostDate(new Date('2021-05-24')), '2021-05-24');
});

test('新时间带秒和 +08:00，并保留同一时刻', () => {
	const instant = new Date('2026-11-06T15:25:49Z');
	assert.equal(postTimestamp(instant), '2026-11-06T23:25:49+08:00');
	assert.equal(new Date(postTimestamp(instant)).valueOf(), instant.valueOf());
	assert.equal(postTimestamp(new Date('2026-11-05T16:00:00Z')), '2026-11-06T00:00:00+08:00');
});

test('post:new 自动填时间，post:publish 保留 date/updated，CLI 按实际时刻排列', () => {
	const root = mkdtempSync(join(tmpdir(), 'blog-post-dates-'));
	try {
		for (const dir of ['scripts', 'content', 'src/lib']) mkdirSync(join(root, dir), { recursive: true });
		const repo = fileURLToPath(new URL('..', import.meta.url));
		for (const file of ['scripts/posts.mjs', 'src/lib/post-dates.mjs', 'content/_template.md']) {
			copyFileSync(join(repo, file), join(root, file));
		}
		const run = (...args) => {
			const result = spawnSync(process.execPath, ['scripts/posts.mjs', ...args], {
				cwd: root, env: { ...process.env, TZ: 'UTC' }, encoding: 'utf8',
			});
			assert.equal(result.status, 0, result.stderr);
			return result.stdout;
		};
		run('new', 'engineering/example', '示例');
		const path = join(root, 'content/engineering/example.md');
		const before = readFileSync(path, 'utf8');
		const dates = (text) => text.match(/^(?:date|updated): .+$/gm);
		assert.match(before, /^date: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/m);
		run('publish', 'engineering/example');
		const after = readFileSync(path, 'utf8');
		assert.deepEqual(dates(after), dates(before));
		assert.match(after, /^draft: false$/m);
		for (const [id, date] of [['late', '2026-11-06T00:30:00+08:00'], ['early', '2026-11-05T17:00:00+02:00']]) {
			writeFileSync(join(root, `content/engineering/${id}.md`), `---\ntitle: ${id}\ndate: "${date}"\ndraft: false\n---\n`);
		}
		const list = run('list');
		assert.ok(list.indexOf('engineering/late') < list.indexOf('engineering/early'));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
