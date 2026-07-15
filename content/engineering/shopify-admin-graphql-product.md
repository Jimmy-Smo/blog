---
title: Shopify Admin GraphQL 商品接入主路径
description: 用 Admin GraphQL API 完成商品建改、价格库存、媒体上传与渠道发布的完整链路，含媒体状态轮询与文件格式校验
date: 2026-07-16
updated: 2026-07-16
tags:
  - engineering
  - shopify
  - graphql
  - ecommerce
status: versioned
draft: true
---

# Shopify Admin GraphQL 商品接入主路径

> 整理自 2025-09 两周的对接实战笔记。Shopify Admin API 按季度发版，mutation 名称与字段以对接时的 API 版本文档为准（本文核验于 2025-09）。

## 问题

把自有商品系统对接到 Shopify，需要覆盖：建商品、改价格、调库存、传图片、控制上下架。REST API 存在过取/欠取问题，Shopify 已把 Admin API 重心放在 GraphQL 上。要理清：

1. 商品、选项、变体的模型关系；
2. 每类操作用哪个 mutation；
3. 媒体上传的异步状态怎么处理；
4. 常见报错（如"扩展名与实际格式不匹配"）怎么防。

## 核心结论

各操作的主路径 mutation：

| 操作 | 入口 |
|------|------|
| 建/改商品（标题、选项、变体、状态、部分 metafields） | `productSet` |
| 批量改价 | `productVariantsBulkUpdate` |
| 库存调整（按 location） | `inventoryAdjustQuantities` |
| 媒体上传 | `fileCreate` 上传 → `productVariantAppendMedia` 挂载 |
| 渠道级上/下架 | `publishablePublish` / `publishableUnpublish` |
| 自定义属性/类目映射 | metafields（自定 namespace/key） |

- **媒体处理是异步的**：上传后按 `id` 轮询 `media.status`（`PROCESSING/READY/FAILED`），用**指数退避**，批量用 `nodes(ids: [...])`。
- **上传前校验文件头（Magic Number）与扩展名一致**，否则触发"扩展名与实际格式不匹配"类失败。
- 建议把"构建/更新/价格/库存/媒体/发布/扩展属性"各封装成可复用的 GraphQL 片段脚手架。

## 原理

### Option 与 Variant 的关系

- **Option** 是变体的**维度**（如 Color、Size）；
- **Variant** 是维度取值的**具体组合**（如 "Red, M"），价格、库存、SKU 都挂在 Variant 上。

建模时先定义 Options，Variants 是其笛卡尔积的子集。

### GraphQL 按需取字段

查询按商品 ID 取信息时自选字段，避免 REST 的整包返回：

```graphql
query {
  product(id: "gid://shopify/Product/1234567890") {
    id
    title
    variants(first: 50) { nodes { id sku price } }
  }
}
```

### 为什么要校验 Magic Number

Shopify 侧按文件真实内容审核格式。JPEG 文件头为 `FF D8 FF E0`（或 `FF D8 FF E1` 等变体），文件尾 `FF D9`；扩展名是 `.jpg` 但内容不是 JPEG 时上传/审核失败。**以文件头为准**判定真实格式，Content-Type、扩展名三者对齐后再上传。

### 发布是渠道级的

商品"上架"不是布尔开关，而是发布到具体渠道（Online Store、Shop、Markets 等）；`publishablePublish` 控制的是"商品 × 渠道"关系。GraphiQL 只是调试工具，不是流程环节。

## 实践与验证

### 媒体状态轮询

```graphql
query pollMedia($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on MediaImage { id status mimeType }
  }
}
```

- 退避节奏：`1s → 2s → 4s …`，设最大间隔与总超时兜底；
- 也可从 `files`/`media` 入口分页拉取后按状态过滤；
- `FAILED` 的媒体记录原因并进重试/人工队列。

### 多语言与自定义类目

类目映射走 metafields（如自定义"袖长"）；多语言可用多命名空间或翻译表承载。

### 对接检查清单

- [ ] Options/Variants 结构先在测试店验证，再批量灌数
- [ ] 上传前：文件头 ↔ Content-Type ↔ 扩展名三者一致
- [ ] 媒体轮询有退避、上限与失败兜底
- [ ] 价格、库存分别走批量接口，不逐个 Variant 调用
- [ ] 发布渠道显式指定，不依赖默认行为

## 适用边界

- 核验于 2025-09 的 Admin GraphQL API；Shopify 按季度发版并弃用旧字段，**对接前必查目标版本的 changelog**。
- `productSet` 承载能力有上限（变体数量等配额随商店套餐不同），超大 SKU 集需分批。
- 本文不覆盖 Storefront API（面向前台展示，鉴权与能力集不同）。

## 参考资料

- Shopify Admin GraphQL API：https://shopify.dev/docs/api/admin-graphql
- productSet mutation：https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet
- 文件签名列表（Magic Numbers）：https://en.wikipedia.org/wiki/List_of_file_signatures
