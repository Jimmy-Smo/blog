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

// 代码就是正文的一部分, 默认完整显示。只有超过这个行数的长块才在有 JS 时收成预览,
// 底部渐隐加「展开全部」; 无 JS 时照样全部展开, 不会把内容藏起来。
const LONG_BLOCK_MIN_LINES = 26;

// 纯文本 (报错信息、日志、命令输出) 自动换行, 不让一行报错被横向截断。
const WRAP_LANGUAGES = new Set(['text', 'plaintext', 'txt']);

// 界面文案按文章语言切换: content/en/ 下的英文版用英文。
const LABELS = {
	zh: {
		lines: (n) => `${n} 行`,
		copy: '复制',
		copied: '已复制',
		wrap: '自动换行',
		expand: (n) => `展开全部 ${n} 行`,
		collapse: '收起',
	},
	en: {
		lines: (n) => `${n} lines`,
		copy: 'Copy',
		copied: 'Copied',
		wrap: 'Wrap lines',
		expand: (n) => `Show all ${n} lines`,
		collapse: 'Collapse',
	},
};

// 图标取自 Lucide (ISC), 线宽与站点头部图标一致。
const ICONS = {
	copy: [
		['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }],
		['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }],
	],
	check: [['path', { d: 'M20 6 9 17l-5-5' }]],
	wrap: [
		['path', { d: 'm16 16-2 2 2 2' }],
		['path', { d: 'M3 12h15a3 3 0 1 1 0 6h-4' }],
		['path', { d: 'M3 18h7' }],
		['path', { d: 'M3 6h18' }],
	],
};

function icon(name, extraClass) {
	return {
		type: 'element',
		tagName: 'svg',
		properties: {
			className: ['code-block__icon', extraClass].filter(Boolean),
			viewBox: '0 0 24 24',
			width: '14',
			height: '14',
			fill: 'none',
			stroke: 'currentColor',
			strokeWidth: '2',
			strokeLinecap: 'round',
			strokeLinejoin: 'round',
			ariaHidden: 'true',
		},
		children: ICONS[name].map(([tagName, properties]) => ({ type: 'element', tagName, properties, children: [] })),
	};
}

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

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

function wrap(pre, t) {
	const rawLanguage = String(pre.properties?.dataLanguage ?? 'text').toLowerCase();
	const language = LANGUAGE_LABELS[rawLanguage] ?? rawLanguage.toUpperCase();
	const lines = lineCount(pre);
	const long = lines >= LONG_BLOCK_MIN_LINES;

	const className = ['code-block'];
	if (long) className.push('code-block--long');
	if (WRAP_LANGUAGES.has(rawLanguage)) className.push('code-block--wrap');

	const children = [
		el('div', { className: ['code-block__bar'] }, [
			el('span', { className: ['code-block__lang'] }, [text(language)]),
			el('span', { className: ['code-block__lines'] }, [text(t.lines(lines))]),
			// 换行开关只在代码真的横向溢出时由脚本显示出来
			el(
				'button',
				{ type: 'button', className: ['code-block__btn', 'code-block__wrap'], ariaPressed: 'false', ariaLabel: t.wrap, title: t.wrap },
				[icon('wrap')],
			),
			el(
				'button',
				{ type: 'button', className: ['code-block__btn', 'code-block__copy'], ariaLabel: t.copy, title: t.copy, dataCopied: t.copied },
				[icon('copy', 'code-block__icon--idle'), icon('check', 'code-block__icon--done')],
			),
		]),
		text('\n'),
		pre,
	];
	if (long) {
		children.push(
			el(
				'button',
				{ type: 'button', className: ['code-block__expand'], ariaExpanded: 'false', dataCollapse: t.collapse },
				[text(t.expand(lines))],
			),
		);
	}
	return el('div', { className, dataLines: String(lines) }, children);
}

function transformChildren(parent, t) {
	if (!Array.isArray(parent.children)) return;

	parent.children = parent.children.map((child) => {
		if (isElement(child, 'pre') && child.children.some((node) => isElement(node, 'code'))) {
			return wrap(child, t);
		}

		transformChildren(child, t);
		return child;
	});
}

export default function rehypeCodeFold() {
	return (tree, file) => {
		const path = String(file?.path ?? file?.history?.[0] ?? '');
		const lang = /[\\/]content[\\/]en[\\/]/.test(path) ? 'en' : 'zh';
		transformChildren(tree, LABELS[lang]);
	};
}
