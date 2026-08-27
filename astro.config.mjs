// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import pagefind from 'astro-pagefind';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // 必填: sitemap / RSS / canonical 都靠它拼绝对 URL, 漏了会在构建 RSS 时报错。
  site: 'https://jimmy42x.com',

  // 产出 /blog/xxx/index.html, URL 带尾斜杠。
  // 与 Workers 的 html_handling 默认值 auto-trailing-slash 保持一致, 避免来回 301。
  build: { format: 'directory' },

  // pagefind() 必须排在最后: 它在构建结束后扫描 dist/*.html 生成静态索引。
  integrations: [mdx(), sitemap(), pagefind()],

  // 代码块双主题: 输出 --shiki-light/--shiki-dark 两组 CSS 变量,
  // global.css 里按 prefers-color-scheme 切换。
  markdown: {
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
