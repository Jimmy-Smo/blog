import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * 已发布文章, 按日期倒序。
 * draft 只在生产构建时过滤——`astro dev` 里仍能预览草稿。
 */
export async function getPublishedPosts(): Promise<Post[]> {
	const posts = await getCollection('blog', ({ data }) => !data.draft || !import.meta.env.PROD);
	return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 汇总标签及出现次数, 按数量倒序。 */
export function collectTags(posts: Post[]): Array<{ tag: string; count: number }> {
	const map = new Map<string, number>();
	for (const post of posts) {
		for (const tag of post.data.tags) {
			map.set(tag, (map.get(tag) ?? 0) + 1);
		}
	}
	return [...map.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** 按 UTC 年份分组, 新的年份在前。跨年才需要把结果渲染成带标题的多段。 */
export function groupByYear(posts: Post[]): Array<{ year: number; posts: Post[] }> {
	const map = new Map<number, Post[]>();
	for (const post of posts) {
		const year = post.data.date.getUTCFullYear();
		const list = map.get(year);
		if (list) list.push(post);
		else map.set(year, [post]);
	}
	return [...map.entries()]
		.sort((a, b) => b[0] - a[0])
		.map(([year, yearPosts]) => ({ year, posts: yearPosts }));
}

type Status = Post['data']['status'];

/**
 * 维护状态的展示元数据。首页条目只用到 label/dot, 文章页的维护状态条用全量字段。
 * dot 是追加在 .dot 上的修饰类名 ('' 表示默认的绿色)。
 */
export const STATUS_META: Record<
	Status,
	{ label: string; dot: string; note: string; staleness?: string; revision: string }
> = {
	evergreen: {
		label: '长期维护',
		dot: '',
		note: '内容会持续修订',
		revision:
			'这篇处于长期维护状态，源文件放在 GitHub 仓库里。发现事实错误、版本对不上或结论有出入，欢迎直接提 Issue。',
	},
	versioned: {
		label: '版本相关',
		dot: 'dot--warn',
		note: '结论与命令绑定特定版本，时效性强',
		staleness: '这篇涉及具体版本的命令行为，使用前请对照你所在环境的版本核对。',
		revision: '这篇的内容绑定特定版本。如果你环境里的版本对不上，欢迎在 Issue 里指出。',
	},
	archived: {
		label: '已归档',
		dot: 'dot--archived',
		note: '仅作历史参考，不再更新',
		staleness: '这篇已停止维护，内容可能已过时，请谨慎参考。',
		revision: '这篇已归档，源文件还留在 GitHub 仓库里，仅作历史参考。',
	},
};

/**
 * 标签的中文显示名。URL 与 frontmatter 仍用英文 slug, 只有页面上显示这里的名字;
 * 没登记的标签原样显示。新增标签词时顺手在这里补一行。
 */
const TAG_LABELS: Record<string, string> = {
	engineering: '工程',
	business: '商业',
	java: 'Java',
	jvm: 'JVM',
	'ai-tools': 'AI 工具',
	reading: '读书',
	git: 'Git',
	mysql: 'MySQL',
	gradle: 'Gradle',
	shopify: 'Shopify',
	elasticsearch: 'Elasticsearch',
	mq: '消息队列',
	proxy: '代理',
	kotlin: 'Kotlin',
	'spring-boot': 'Spring Boot',
	webservice: 'WebService',
	kubernetes: 'Kubernetes',
	heapdump: 'HeapDump',
	'claude-code': 'Claude Code',
	cursor: 'Cursor',
	agent: 'Agent',
	product: '产品',
	startup: '创业',
	investing: '投资',
	macroeconomics: '宏观经济',
	strategy: '战略',
	delivery: '交付',
	programming: '编程',
	'science-fiction': '科幻',
	weekly: '周刊',
};

export function tagLabel(tag: string): string {
	return TAG_LABELS[tag] ?? tag;
}

/**
 * 系列: frontmatter 里 `series: <key>` 的文章在首页「最新文章」里折叠成一条,
 * 指向系列索引页, 避免一次发一批时把首页刷满。/blog 和标签页仍逐篇列出。
 */
export const SERIES: Record<string, { index: string; label: string }> = {
	'hn-books': { index: 'reading/hacker-news-book-list', label: '二十本技术人的书' },
};

export type FeedItem = { post: Post; seriesCount?: number };

/** 首页用的时间线: 同一系列只保留一条 (以系列索引页代表), 位置取该系列最新一篇。 */
export function collapseSeries(posts: Post[]): FeedItem[] {
	const counts = new Map<string, number>();
	for (const p of posts) {
		const s = p.data.series;
		if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
	}
	const seen = new Set<string>();
	const items: FeedItem[] = [];
	for (const p of posts) {
		const s = p.data.series;
		const meta = s ? SERIES[s] : undefined;
		if (!s || !meta) {
			items.push({ post: p });
			continue;
		}
		if (seen.has(s)) continue;
		seen.add(s);
		const index = posts.find((x) => x.id === meta.index) ?? p;
		items.push({ post: index, seriesCount: counts.get(s) });
	}
	return items;
}
