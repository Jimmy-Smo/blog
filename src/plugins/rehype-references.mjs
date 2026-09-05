function textContent(node) {
	return node.value ?? node.children?.map(textContent).join('') ?? '';
}

// 仅包装参考章节, 到下一个 h1/h2 为止, 避免影响正文和后续章节。
export default function rehypeReferences() {
	return (tree) => {
		for (let i = 0; i < tree.children.length; i++) {
			const heading = tree.children[i];
			if (heading.tagName !== 'h2' || !/^参考(?:资料)?$/.test(textContent(heading).trim())) continue;
			let end = i + 1;
			while (end < tree.children.length && !/^h[12]$/.test(tree.children[end].tagName)) end++;
			const children = tree.children.slice(i, end);
			for (const child of children) {
				if (child.tagName === 'ul') child.tagName = 'ol';
			}
			tree.children.splice(i, end - i, {
				type: 'element',
				tagName: 'section',
				properties: { className: ['references'] },
				children,
			});
		}
	};
}
