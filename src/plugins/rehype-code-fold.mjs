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

function isElement(node, tagName) {
	return node?.type === 'element' && node.tagName === tagName;
}

function lineCount(pre) {
	const code = pre.children.find((child) => isElement(child, 'code'));
	if (!code) return 1;

	const highlightedLines = code.children.filter(
		(child) =>
			child.type === 'element' &&
			Array.isArray(child.properties?.className) &&
			child.properties.className.includes('line'),
	);
	if (highlightedLines.length) return highlightedLines.length;

	const text = code.children
		.filter((child) => child.type === 'text')
		.map((child) => child.value)
		.join('');
	return Math.max(1, text.replace(/\n$/, '').split('\n').length);
}

function fold(pre) {
	const rawLanguage = String(pre.properties?.dataLanguage ?? 'text').toLowerCase();
	const language = LANGUAGE_LABELS[rawLanguage] ?? rawLanguage.toUpperCase();
	const lines = lineCount(pre);

	return {
		type: 'element',
		tagName: 'details',
		properties: { className: ['code-fold'] },
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
