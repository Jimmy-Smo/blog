import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

// 内容层直接指向仓库根部的 content/, 不搬文章。
// 排除: 下划线开头的模板、各目录 README、weekly (留到 V2 单开集合)。
const blog = defineCollection({
	loader: glob({
		base: './content',
		pattern: ['**/[^_]*.{md,mdx}', '!**/README.md', '!weekly/**'],
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			updated: z.coerce.date().optional(),
			/** 主题: 少而固定, 见 src/lib/posts.ts 的 TOPICS。 */
			topic: z.enum(['engineering', 'ai', 'business', 'reading']),
			tags: z.array(z.string()).default([]),
			status: z.enum(['evergreen', 'versioned', 'archived']).default('evergreen'),
			draft: z.boolean().default(true),
			/** 系列 key, 见 src/lib/posts.ts 的 SERIES。 */
			series: z.string().optional(),
			heroImage: z.optional(image()),
		}),
});

export const collections = { blog };
