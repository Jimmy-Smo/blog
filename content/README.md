# 内容目录

博客文章和可以公开查看的草稿都在这里，长期维护。

## 本地目录

`content/` 下的子目录只给写作时归类文件，站点不按目录做导航。读者从时间线和标签进文章。

现有分法（有文章再开新目录，不要用空目录占位）：

- `java/`：Java 语言、并发、业务开发与工程实践
- `jvm/`：JVM 原理、GC、诊断和性能分析
- `ai-tools/`：AI 编程工具、Agent 与开发者工作流
- `engineering/`：数据库、消息队列、网络、构建和交付实践
- `business/`：商业判断、战略、产品和长期生存，材料来自公开演讲与报道
- `weekly/`：不定期发布的精选周刊（尚未纳入站点集合）

公开分类用 frontmatter 的 `tags`。站点只认标签，不认目录。

默认 2 个：货架 1 个，再加 1 个明年还可能再写的词。只有两件会独立再写的栈才打到 3。不确定就只打货架。不要把章节名、人名、一次性细节做成标签。

货架五选一：`engineering` `business` `java` `jvm` `ai-tools`。

现有具体词：`git` `mysql` `gradle` `shopify` `elasticsearch` `mq` `proxy` `kotlin` `spring-boot` `webservice` `kubernetes` `claude-code` `cursor` `agent` `product` `startup` `investing` `macroeconomics` `strategy` `delivery`。新词只在你明确会再写一篇时才加。

## 发布标准

一篇文章公开到博客前，应满足：

1. 主题单一，标题能直接表达写了什么。
2. 结论和事实可以追溯到实验、源码或可靠来源。
3. 版本敏感内容标明适用版本和核验日期。
4. 删除内部项目、个人身份、账号和未脱敏数据。
5. 图片用 `npm run img -- <topic/slug> <图片...>` 传到 R2 图床，正文引用返回的
   `https://img.jimmy42x.com/...` 绝对 URL，不提交大图进仓库、不引用桌面绝对路径。
6. `draft` 设置为 `false`。

新文章从 [`_template.md`](_template.md) 开始。
