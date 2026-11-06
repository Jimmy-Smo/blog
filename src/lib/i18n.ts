// 站点以中文为主, 只有挑选过的文章有英文版 (content/en/, URL 前缀 /en/)。
// 这里集中放两种语言下的界面文案, 布局和组件按 lang 取用。

export type Lang = 'zh' | 'en';

export const HTML_LANG: Record<Lang, string> = { zh: 'zh-CN', en: 'en' };

/** 英文版文章的 URL 和对应中文原文的 URL, 两边 id 相同。 */
export const zhPostUrl = (id: string) => `/blog/${id}/`;
export const enPostUrl = (id: string) => `/en/blog/${id}/`;

export const UI = {
	zh: {
		toc: '本文目录',
		tocSections: (n: number) => `${n} 节`,
		posts: '文章',
		postsHref: '/blog/',
		revised: '修订',
		series: '系列：',
		seriesIndex: '系列目录：',
		allPosts: '← 全部文章',
		morePosts: (topic: string) => `更多 ${topic} 文章`,
		viewSource: '在 GitHub 上查看源文件',
		articleNav: '文章导航',
		switchLabel: 'EN',
		switchTitle: 'English',
		translationLink: 'English',
	},
	en: {
		toc: 'Contents',
		tocSections: (n: number) => `${n} sections`,
		posts: 'English',
		postsHref: '/en/',
		revised: 'revised',
		series: 'Series: ',
		seriesIndex: 'Series: ',
		allPosts: '← All English posts',
		morePosts: () => '',
		viewSource: 'View source on GitHub',
		articleNav: 'Article navigation',
		switchLabel: '中',
		switchTitle: '中文',
		translationLink: '中文原文',
	},
} as const;

/** 英文版的维护状态文案, 和 posts.ts 里中文的 STATUS_META 一一对应。 */
export const STATUS_META_EN = {
	evergreen: {
		label: 'Maintained',
		staleness: undefined,
		revision: 'This post is maintained. The source lives on GitHub; issues and corrections are welcome.',
	},
	versioned: {
		label: 'Version-specific',
		staleness: 'Parts of this post depend on specific versions or dates. Check them against your own environment before relying on them.',
		revision: 'This post is tied to specific versions. If yours differ, feel free to open an issue.',
	},
	archived: {
		label: 'Archived',
		staleness: 'This post is no longer maintained and may be out of date.',
		revision: 'This post is archived and kept for reference only.',
	},
} as const;
