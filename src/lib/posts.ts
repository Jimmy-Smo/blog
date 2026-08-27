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

/** 文章所属主题目录, 即 post.id 的第一段 (如 "jvm")。 */
export function topicOf(post: Post): string {
	return post.id.split('/')[0];
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
		note: '内容持续修订，命令与结论会随工具链更新',
		revision:
			'这篇处于长期维护状态，源文件以 Markdown 存放在 til 仓库。命令失效、版本对不上或结论有出入，欢迎直接提 Issue。',
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
		revision: '这篇已归档，源文件仍保存在 til 仓库，仅作历史参考。',
	},
};
