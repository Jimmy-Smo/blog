// 正文里的远程图片 (R2 图床) 不走 Astro 优化管线, 输出的是裸 <img>:
// 没有 lazy 属性, 文末配图也会首屏加载; 没有 width/height, 图片加载完成前
// 不占高度, 正文会跳版 (CLS)。
//
// 这里在构建期统一补齐:
//   - loading/decoding: 所有正文图都补, 配图没必要抢首屏带宽。
//   - width/height: 查 src/data/image-sizes.json (npm run img 上传时记录),
//     命中则补上, 浏览器按属性预留空间; 没记录的图只补 lazy, 不阻塞构建。
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MANIFEST = fileURLToPath(new URL('../data/image-sizes.json', import.meta.url));

const sizes = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

function transformChildren(parent) {
	if (!Array.isArray(parent.children)) return;

	for (const child of parent.children) {
		if (child.type === 'element' && child.tagName === 'img') {
			child.properties.loading ??= 'lazy';
			child.properties.decoding ??= 'async';
			const size = sizes[child.properties.src];
			if (size) {
				child.properties.width ??= size.w;
				child.properties.height ??= size.h;
			}
		} else {
			transformChildren(child);
		}
	}
}

export default function rehypeProseImages() {
	return transformChildren;
}
