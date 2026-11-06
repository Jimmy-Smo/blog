import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export type EnPost = CollectionEntry<'en'>;

/**
 * 已发布文章, 按日期倒序。
 * draft 只在生产构建时过滤——`astro dev` 里仍能预览草稿。
 */
export async function getPublishedPosts(): Promise<Post[]> {
	const posts = await getCollection('blog', ({ data }) => !data.draft || !import.meta.env.PROD);
	return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 英文版文章, 和中文同样的草稿规则, 按日期倒序。 */
export async function getEnglishPosts(): Promise<EnPost[]> {
	const posts = await getCollection('en', ({ data }) => !data.draft || !import.meta.env.PROD);
	return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 有英文版的中文文章 id 集合。 */
export async function getTranslatedIds(): Promise<Set<string>> {
	return new Set((await getEnglishPosts()).map((p) => p.id));
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
 * 主题: 站点的一级分类, 少而固定, 每篇必须有且只有一个 (frontmatter `topic`)。
 * 标签 (`tags`) 是更细的二级关键词, 可以多, 一律英文 slug。
 */
export const TOPICS = {
	engineering: { label: 'Engineering', note: '后端、数据库、构建、网络与交付' },
	ai: { label: 'AI', note: 'AI 编程工具、Agent 与开发者工作流' },
	business: { label: 'Business', note: '商业判断、战略与产品，材料来自公开演讲与报道' },
	reading: { label: 'Reading', note: '一本书一篇的解读' },
} as const;

export type Topic = keyof typeof TOPICS;

/** 主题及篇数, 按 TOPICS 里的固定顺序, 没有文章的主题不返回。 */
export function collectTopics(posts: Post[]): Array<{ topic: Topic; count: number }> {
	return (Object.keys(TOPICS) as Topic[])
		.map((topic) => ({ topic, count: posts.filter((p) => p.data.topic === topic).length }))
		.filter((t) => t.count > 0);
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
