# TIL

一个公开、持续维护的学习知识库，记录经过整理和验证的技术笔记、专题手册与研究总结。

这里不再把周总结当作主要知识载体。专题文章围绕一个主题组织，便于检索、复习，并能直接作为未来博客的内容源；精选周刊只负责串联本期新增内容与值得继续关注的问题。

## 内容导航

- [`content/`](content/)：按主题维护的正式内容
- [`content/_template.md`](content/_template.md)：新文档模板
- [`content/weekly/`](content/weekly/)：可选的公开精选周刊，不强制周更
- [`archive/weekly/`](archive/weekly/)：历史周总结，只归档，不再沿用这种写作方式


## 站点

内容由 [Astro](https://astro.build/) 构建成纯静态站，托管在 Cloudflare Workers Static Assets 上，
线上地址 <https://jimmy42x.com>。纯静态站不需要 `@astrojs/cloudflare` 适配器 —— Workers 直接从边缘
读 `dist/` 返回，不执行用户代码。

```bash
npm install
npm run dev        # http://localhost:4321，dev 下草稿也可预览
npm run build      # 产出 dist/，并生成 dist/pagefind/ 搜索索引
npm run cf:dev     # 按线上语义预览（不是 astro dev）；搜索需要先 build 一次
```

> `cf:*` 脚本前面的 `env -u all_proxy` 不能删：wrangler 的 undici 不认 `socks5://` 代理，
> 带着 `all_proxy` 会直接 `fetch failed`。

### 写作与发布

```bash
npm run post:list                              # 全部文章与发布状态一览
npm run post:new -- <topic/slug> "标题"         # 从 content/_template.md 新建
npm run post:publish -- <topic/slug>           # draft: false + updated 改为今天
npm run img -- <topic/slug> <图片...>           # 压成 WebP 上传 R2，输出 Markdown
```

文章的 frontmatter 由 `src/content.config.ts` 里的 zod schema 在构建期校验，**字段写错会直接构建失败**，
而不是悄悄渲染出一个空白页。`draft: true` 的文章只在 `npm run dev` 下可见，生产构建会跳过。

图片走 R2 图床 `img.jimmy42x.com`：`npm run img` 会缩到 1600px 以内、转 WebP、
在文件名里加内容哈希后上传。哈希是刻意的 —— 图片带一年期 `immutable` 缓存头，
换图自动变成新 key，不会被 CDN 缓存挡住，同一张图重传也天然幂等。

## 分支与发布

- `dev`：日常整理；`main`：稳定公开内容。
- 合并到 `main` 后把 `main` 回灌 `dev`；可选打版本标签（**不加** `v` 前缀）。完整步骤见 [`RELEASING.md`](RELEASING.md)。
- **推送到 `main` 会触发 Cloudflare Workers Builds 自动构建并部署**，PR 会生成预览地址。
  本地 `npm run cf:deploy` 仅用于应急，日常不要用，避免和 CI 互相覆盖。

## 文档类型

- **专题手册**：围绕一条知识主线长期维护，包含学习地图、原理、实验和参考资料。
- **技术笔记**：解决一个明确问题，记录结论、原理、验证过程和适用边界。
- **研究总结**：对会议、文章或资料进行二次整理，明确事实、观点、来源和时间范围。
- **精选周刊**：链接本期新增专题，提炼少量结论、资料和后续观察，不重复专题正文。

## 写作约定

正式内容使用 Markdown，并在文首保留统一元数据：

- `title`、`description`
- `date`、`updated`
- `tags`
- `status`：`evergreen`、`versioned` 或 `archived`
- `draft`：公开发布前应为 `false`

正文优先使用“问题—结论—原理—实践与验证—边界—参考资料”的结构。涉及框架、产品、价格或政策时，必须标明版本或核验日期。

## 公开边界

本仓库只保存适合公开发布的成稿，不提交：

- 工作项目的内部信息、真实账号、密钥或未脱敏数据
- 未整理的个人复盘和会议原文
- 未核验的账号、代理或第三方服务推荐
- 仅用于备份的 PDF、音视频和其他大文件

原始材料和草稿放在独立的私有资料库；二进制原件由 iCloud 保存。

## 许可

- 站点代码（`src/`、`public/`、配置文件）：[MIT](LICENSE)
- 文章内容（`content/`、`archive/`）：[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans)，转载需署名并注明出处，禁止商用
- 标题/引用字体：[霞鹜文楷](https://github.com/lxgw/LxgwWenKai)（SIL OFL，经 npm 包 `lxgw-wenkai-webfont` 分块自托管）

## 历史说明

`archive/weekly/` 保留 2025 年按日期记录的旧笔记，方便追溯学习过程。后续有复用价值的内容会重新整理为主题文章，而不是直接复制旧周报。
