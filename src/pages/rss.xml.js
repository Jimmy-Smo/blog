import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/posts';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const posts = await getPublishedPosts();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			link: `/blog/${post.id}/`,
			categories: post.data.tags,
		})),
		customData: '<language>zh-CN</language>',
	});
}
