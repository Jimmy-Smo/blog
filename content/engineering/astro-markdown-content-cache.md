---
title: Markdown 插件改了，为什么旧文章没更新
description: 一次参考区样式调整中，英文页仍输出旧 HTML。沿着页面源码、Astro 内容存储和 glob loader 排查，最后用热缓存与清缓存构建做对照。
date: 2026-11-06
updated: 2026-11-06
topic: engineering
tags: []
status: versioned
draft: false
---

给博客统一参考资料的样式时，我顺便让 Markdown 插件支持了英文的 `References` 标题。中文文章改完了，CSS 也发布了，英文参考区却还是原来的样子。

本地构建通过，Cloudflare Workers Builds 也显示成功。问题出在一个容易漏看的地方：英文文章正文没改，构建复用了之前保存的 HTML，新的插件逻辑没有作用到它上面。

下面记录的是这个博客在 Astro 7.2.8、`glob()` 内容加载器、默认单文件内容存储下的行为，核验日期为 2026-11-06。它是一次具体排查，不能据此断言所有 Astro 版本或加载方式都有同样的问题。

## 先分清缺的是 CSS，还是 HTML

参考区插件做两件事：找到二级标题「参考」「参考资料」或 `References`，把这一节包进 `section.references`；把其中的无序列表改为编号列表。CSS 再用 `.references` 选择器设置字号和间距。

英文页看起来没变时，我先检查了发布后的 CSS，再检查页面源码。CSS 里已经有新字号和行距，英文页却没有 `section.references`。

到这一步，继续调字号就没有用了：样式所依赖的结构根本没有生成。接下来要查的是 Markdown 处理结果从哪里来。

可以直接下载页面查看，避免只凭浏览器里的视觉印象判断：

```bash
curl -fsSL https://jimmy42x.com/en/blog/ai-tools/multi-agent-development/ \
  -o /tmp/article.html
rg 'section class="references"' /tmp/article.html
```

这个命令检查的是该页面当前是否带有包装结构，不会验证所有样式，也不能单独证明部署或缓存的根因。

## 内容存储里可以保存渲染后的 HTML

这个博客通过 `glob()` 读取仓库根目录的 Markdown，再用 `render()` 输出文章。Astro 的内容层不只保存 frontmatter，也可能保存渲染结果。

在安装的 7.2.8 版本里，`astro/dist/content/loaders/glob.js` 会用文件内容生成 digest。已有条目的 digest 与当前内容相同、且已有文件路径时，会直接复用条目，不再走后面的渲染分支。

这个条件解释了为什么「正文没改」很关键。不过，只看到这一处还不足以断言插件更新一定被忽略，因为内容层还可能根据版本或配置变化清空存储。继续对照 `astro/dist/content/content-layer.js`，可以看到版本、内容配置及可序列化的 Astro 配置参与了清理判断。外部插件文件内部的实现变化，在这次复现中没有触发需要的失效。

所以构建成功与文章重新经过插件处理，是两件需要分别验证的事。构建可以成功地把缓存里的旧结果再输出一遍。

## 用同一篇 Markdown 做三次构建

为了排除线上缓存和其他页面逻辑，我又做了一个独立的最小项目：一个 `glob()` 集合、一篇只有 `## References` 和列表的 Markdown、一张调用 `render()` 的页面，以及同一份参考区插件。为隔离实验，内容缓存目录另设为项目内的 `.build-cache/`。

三次操作都没有改 Markdown：

| 构建 | 改了什么 | 生成的 HTML |
| --- | --- | --- |
| 第一次 | 插件只识别中文参考标题 | 没有参考区包装 |
| 第二次 | 插件增加 `References`，保留第一次缓存 | 仍没有参考区包装 |
| 第三次 | 保持新插件，删除内容存储文件 | 出现 `section.references` |

第二次到第三次只改变了内容存储是否存在。这组对照，加上本地版本的加载器实现，才把问题收到了内容缓存上。

它不代表所有「页面没变化」都该清缓存。页面拿错部署、CSS 没更新、CDN 返回旧响应，都可能出现类似现象。先看缺的具体是哪一层，再做能区分原因的对照。

## 把失效处理放进正式构建入口

在本站默认配置下，开发时的内容存储位于 `.astro/data-store.json`，生产构建使用默认 `cacheDir` 下的 `node_modules/.astro/data-store.json`。这是当前版本与配置的路径；自定义缓存目录或切换存储方式后，需要重新核对。

博客规模较小，我选择每次正式构建都重新生成内容存储，减少发布时漏掉插件变化的机会：

```json
{
  "scripts": {
    "build": "rm -f .astro/data-store.json node_modules/.astro/data-store.json && astro build",
    "cf:deploy": "npm run build && env -u all_proxy wrangler deploy"
  }
}
```

清理范围只有两个已知的生成文件，没有删除 Markdown、依赖包或整份缓存目录。`cf:deploy` 也复用 `npm run build`，避免应急手动部署绕过这一处理；正常发布仍由合并到 `main` 触发 Cloudflare 构建。

这会牺牲内容增量构建的一部分收益。对本站当前几十篇文章的规模，这个取舍可以接受；大型站点应进一步评估构建耗时、缓存失效规则和插件相关的自动检查，不宜直接照搬每次清理。

## 发布后查结果，不能只看绿色状态

修复发布后，我重新请求了英文文章，确认 `section.references` 已生成。中文文章、参考区 CSS 和 Cloudflare 的成功状态也分别核对了一遍。

这次留下的检查方式很简单：涉及 Markdown 渲染的改动，挑一篇正文同时变了的文章，再挑一篇正文完全没变的文章检查。前者验证新内容能处理，后者验证已有内容能否得到新结构。只查看刚编辑过的文章，容易把缓存失效问题漏过去。

本文没有修改 Astro 的缓存算法，也没有证明这是上游所有版本都存在的缺陷。修复只是让这个站点的正式构建入口得到当前插件处理后的内容。

## 参考资料

- [本站参考区修改 PR #12](https://github.com/Jimmy-Smo/blog/pull/12)
- [本站构建缓存修复 PR #13](https://github.com/Jimmy-Smo/blog/pull/13)
- [Astro 内容加载器参考](https://docs.astro.build/en/reference/content-loader-reference/)
- [本站当前构建命令](https://github.com/Jimmy-Smo/blog/blob/main/package.json)

实现判断对照了本地安装的 Astro 7.2.8 中 `dist/content/loaders/glob.js`、`dist/content/content-layer.js` 与 `dist/content/paths.js`；独立项目于 2026-11-06 完成热缓存和清理后的构建对照。
