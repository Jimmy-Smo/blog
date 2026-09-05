// @ts-check

import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import mermaid from 'astro-mermaid';
import pagefind from 'astro-pagefind';

import tailwindcss from '@tailwindcss/vite';
import rehypeCodeFold from './src/plugins/rehype-code-fold.mjs';
import rehypeProseImages from './src/plugins/rehype-prose-images.mjs';
import rehypeReferences from './src/plugins/rehype-references.mjs';

// https://astro.build/config
export default defineConfig({
  // 必填: sitemap / RSS / canonical 都靠它拼绝对 URL, 漏了会在构建 RSS 时报错。
  site: 'https://jimmy42x.com',

  // 产出 /blog/xxx/index.html, URL 带尾斜杠。
  // 与 Workers 的 html_handling 默认值 auto-trailing-slash 保持一致, 避免来回 301。
  build: { format: 'directory' },

  // pagefind() 必须排在最后: 它在构建结束后扫描 dist/*.html 生成静态索引。
  // mermaid() 是客户端渲染: 只有含 ```mermaid 围栏的页面才会拉 mermaid chunk,
  // autoTheme 跟随 html[data-theme], 由 BaseHead 的内联脚本保证该属性始终存在。
  //
  // mermaidConfig 是静态对象, 两个主题共用, 所以这里只能放与明暗无关的值。
  // 颜色交给 autoTheme 在 default/dark 两套内置主题之间切换: 往 themeVariables
  // 里塞死 hex 会让其中一边配色错乱。字体不参与 mermaid 的颜色运算, 可以安全覆盖,
  // 否则中文标签会掉进 mermaid 默认的 trebuchet 栈, 和正文不一致。
  integrations: [
    mdx(),
    mermaid({
      theme: 'default',
      autoTheme: true,
      enableLog: false,
      mermaidConfig: {
        themeVariables: { fontFamily: 'var(--font-sans), sans-serif' },
      },
    }),
    sitemap(),
    pagefind(),
  ],

  // 代码块双主题: 输出 --shiki-light/--shiki-dark 两组 CSS 变量,
  // global.css 里按 prefers-color-scheme 切换。
  markdown: {
    processor: unified({ rehypePlugins: [rehypeCodeFold, rehypeProseImages, rehypeReferences] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },

  fonts: [
      {
          provider: fontProviders.local(),
          name: 'Atkinson',
          cssVariable: '--font-atkinson',
          fallbacks: ['sans-serif'],
          options: {
              variants: [
                  {
                      src: ['./src/assets/fonts/atkinson-regular.woff'],
                      weight: 400,
                      style: 'normal',
                      display: 'swap',
                  },
                  {
                      src: ['./src/assets/fonts/atkinson-bold.woff'],
                      weight: 700,
                      style: 'normal',
                      display: 'swap',
                  },
              ],
          },
      },
	],

  vite: {
    plugins: [tailwindcss()],
  },
});
