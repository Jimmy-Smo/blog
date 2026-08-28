# 拾雾

[拾雾](https://jimmy42x.com) 是我的个人博客，写搞懂了的技术，也写看到的、想到的。文章按主题或具体问题整理，写到自洽了再发布。

## 本地开发

站点由 [Astro](https://astro.build/) 构建为纯静态文件，托管在 Cloudflare Workers Static Assets，搜索由 Pagefind 生成。

```bash
npm install
npm run dev        # 本地开发，包含草稿
npm run build      # 构建 dist/ 和搜索索引
npm run cf:dev     # 按线上环境预览，需要先 build
```

## 写作

- [`content/`](content/)：文章和可以公开查看的草稿
- [`archive/weekly/`](archive/weekly/)：2025 年旧周记，只作归档

```bash
npm run post:list                              # 查看文章状态
npm run post:new -- <topic/slug> "标题"         # 新建文章
npm run post:publish -- <topic/slug>           # 发布，保留文章日期
npm run img -- <topic/slug> <图片...>           # 压缩并上传图片
```

文章 frontmatter 由构建期 schema 校验。其中：

- `date` 是文章日期，手动维护，不因集中发布而改变
- `updated` 是最后一次实质修订日期
- `draft: true` 不生成博客页面，但源文件仍会出现在公开仓库
- `status` 可选 `evergreen`、`versioned` 或 `archived`

技术文章不套固定目录，但要交代验证过程和适用边界。涉及版本、产品、价格或政策时，注明版本或核验日期。

图片统一上传到 `img.jimmy42x.com`。脚本会缩放、转为 WebP，并在文件名中加入内容哈希，避免 CDN 缓存旧图。

## 发布

- `dev` 用于日常整理，`main` 保存稳定公开内容
- 推送到 `main` 后由 Cloudflare Workers Builds 自动部署，PR 会生成预览地址
- `npm run cf:deploy` 只用于应急，完整流程见 [RELEASING.md](RELEASING.md)

## 公开边界

仓库可以保存成稿和公开草稿，但不提交：

- 工作项目的内部信息、真实账号、密钥或未脱敏数据
- 未整理的个人复盘和会议原文
- 仅用于备份的 PDF、音视频和其他大文件

原始材料和不适合公开的草稿保存在私有资料库。

## 许可

- 站点代码使用 [MIT](LICENSE)
- 文章内容使用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans)
- 字体使用 [霞鹜文楷](https://github.com/lxgw/LxgwWenKai)，遵循 SIL OFL
