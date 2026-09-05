const LANGUAGE_LABELS = {
	bash: 'Shell',
	css: 'CSS',
	dockerfile: 'Dockerfile',
	graphql: 'GraphQL',
	groovy: 'Groovy',
	html: 'HTML',
	java: 'Java',
	javascript: 'JavaScript',
	js: 'JavaScript',
	json: 'JSON',
	kotlin: 'Kotlin',
	markdown: 'Markdown',
	md: 'Markdown',
	plaintext: 'TEXT',
	py: 'Python',
	python: 'Python',
	sh: 'Shell',
	shell: 'Shell',
	sql: 'SQL',
	text: 'TEXT',
	toml: 'TOML',
	ts: 'TypeScript',
	tsx: 'TSX',
	txt: 'TEXT',
	typescript: 'TypeScript',
	xml: 'XML',
	yaml: 'YAML',
	yml: 'YAML',
	zsh: 'Shell',
};

// 折叠条大约两行代码高。8 行以内的片段展开后仍能一眼看完,
// 默认收起只会多一次点击。更长的块才默认折叠, 避免把后文顶出视口。
const AUTO_EXPAND_MAX_LINES = 8;

function isElement(node, tagName) {
	return node?.type === 'element' && node.tagName === tagName;
}

function collectText(node) {
	if (!node) return '';
	if (node.type === 'text') return node.value ?? '';
	if (!Array.isArray(node.children)) return '';
	return node.children.map(collectText).join('');
}

function lineCount(pre) {
	const code = pre.children.find((child) => isElement(child, 'code'));
	if (!code) return 1;
	// Shiki 把每行包进 <span class="line">, 换行落在 span 之间的文本节点里。
	// 必须递归收集, 只数顶层文本会把 "a\nb" 数成 1 行。
	return Math.max(1, collectText(code).replace(/\n$/, '').split('\n').length);
}

function fold(pre) {
	const rawLanguage = String(pre.properties?.dataLanguage ?? 'text').toLowerCase();
	const language = LANGUAGE_LABELS[rawLanguage] ?? rawLanguage.toUpperCase();
	const lines = lineCount(pre);
	const properties = { className: ['code-fold'] };
	if (lines <= AUTO_EXPAND_MAX_LINES) properties.open = true;

	return {
		type: 'element',
		tagName: 'details',
		properties,
		children: [
			{
				type: 'element',
				tagName: 'summary',
				properties: { className: ['code-fold__summary'] },
				children: [
					{
						type: 'element',
						tagName: 'span',
						properties: { className: ['code-fold__meta'] },
						children: [
							{
								type: 'element',
								tagName: 'span',
								properties: { className: ['code-fold__language'] },
								children: [{ type: 'text', value: language }],
							},
							{ type: 'text', value: ' · ' },
							{
								type: 'element',
								tagName: 'span',
								properties: { className: ['code-fold__lines'] },
								children: [{ type: 'text', value: `${lines} 行` }],
							},
						],
					},
					{
						type: 'element',
						tagName: 'span',
						properties: { className: ['code-fold__action'], ariaHidden: 'true' },
						children: [
							{
								type: 'element',
								tagName: 'span',
								properties: { className: ['code-fold__when-closed'] },
								children: [{ type: 'text', value: '展开' }],
							},
							{
								type: 'element',
								tagName: 'span',
								properties: { className: ['code-fold__when-open'] },
								children: [{ type: 'text', value: '收起' }],
							},
						],
					},
				],
			},
			{ type: 'text', value: '\n' },
			pre,
		],
	};
}

function transformChildren(parent) {
	if (!Array.isArray(parent.children)) return;

	parent.children = parent.children.map((child) => {
		if (isElement(child, 'pre') && child.children.some((node) => isElement(node, 'code'))) {
			return fold(child);
		}

		transformChildren(child);
		return child;
	});
}

export default function rehypeCodeFold() {
	return transformChildren;
}
