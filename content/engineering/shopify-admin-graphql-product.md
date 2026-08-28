---
title: Shopify Admin GraphQL 商品接入：商品、库存、媒体与发布
description: 按 Shopify Admin GraphQL API 2026-07 串起商品同步、变体价格、库存、媒体处理与渠道发布
date: 2026-07-16
updated: 2026-08-28
tags:
  - engineering
  - shopify
  - graphql
  - ecommerce
status: versioned
draft: false
---

> 整理自 2025-09 的商品接入记录，并在 2026-08-28 按 Admin GraphQL API 2026-07 重新核对。Shopify 每季度发布 API 版本，接入时应固定版本，不要依赖 `latest`。

把自有商品系统接到 Shopify，真正容易混乱的是几个对象各自负责什么：商品与变体描述卖什么，库存挂在库存项和地点上，文件先独立上传，商品媒体和变体媒体再引用文件，最后还要单独处理销售渠道发布。

## 商品、选项和变体

Option 是变体维度，比如颜色和尺码；Variant 是具体组合，比如红色 M 码。SKU、价格和库存相关标识都跟着 Variant 走。

外部商品系统要把完整状态同步进 Shopify 时，`productSet` 是主入口。它适合按外部标识创建或更新商品、选项和变体，也支持同步与异步模式。

`productSet` 对列表字段采用完整状态语义。传入 `variants`、`collections` 等列表时，没有出现在输入里的旧项可能被删除，不能把它当成普通的局部补丁。只改少量商品字段时，`productUpdate` 更容易控制影响范围。

## 每类操作走哪条入口

| 操作 | Admin GraphQL 入口 |
|------|--------------------|
| 同步商品、选项和变体的完整状态 | `productSet` |
| 更新少量商品字段 | `productUpdate` |
| 批量更新变体价格等字段 | `productVariantsBulkUpdate` |
| 按地点调整库存数量 | `inventoryAdjustQuantities` |
| 从公开 URL 创建文件 | `fileCreate` |
| 上传本地文件或大文件 | `stagedUploadsCreate`，上传后再调用 `fileCreate` |
| 把文件关联到商品 | `productSet`、`productCreate` 或 `productUpdate` |
| 把商品已有媒体关联到变体 | `productVariantAppendMedia` |
| 渠道发布与下架 | `publishablePublish`、`publishableUnpublish` |

价格和库存最好分开处理。价格属于 Variant，库存调整需要库存项与 Location；把两者塞进同一套重试逻辑，失败后很难判断应该重放哪一段。

## 媒体要分成上传、处理和关联

Shopify 的文件系统与商品是分开的。一个文件可以被多个商品引用，更新文件后，引用它的地方也会跟着变化。

公开可访问的图片可以直接交给 `fileCreate`：

```graphql
mutation CreateFiles($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files {
      id
      fileStatus
      alt
    }
    userErrors {
      field
      message
      code
    }
  }
}
```

本地文件、视频、3D 模型或需要更稳定上传过程的资源，先调用 `stagedUploadsCreate` 获取临时上传地址，把文件传到该地址，再用返回的 `resourceUrl` 调用 `fileCreate` 注册。

`fileCreate` 返回成功不代表媒体已经可用。文件会经历 `UPLOADED`、`PROCESSING`、`READY` 或 `FAILED`，关联商品前应轮询 `fileStatus`：

```graphql
query CheckFileStatus($id: ID!) {
  node(id: $id) {
    ... on File {
      fileStatus
      preview {
        image {
          url
        }
      }
    }
  }
}
```

轮询使用指数退避，并设置最大间隔和总超时。批量任务可以用 `nodes(ids: [...])` 一次查询多个文件，`FAILED` 进入重试或人工处理队列，不要无限轮询。

文件到 `READY` 后，再把文件 ID 关联到商品。需要给某个变体指定图片时，先确认媒体已经属于该商品，再调用 `productVariantAppendMedia`。这个 mutation 只负责建立商品已有媒体与变体之间的关系，不负责上传文件。

## 上传前先检查真实格式

扩展名、Content-Type 和文件真实内容应保持一致。业务系统里常见的失败是文件名写着 `.jpg`，实际内容却是 PNG 或损坏文件。

接入侧可以在上传前读取文件签名，确认格式与声明一致，同时限制单文件大小和像素。这个检查不能替代 Shopify 的处理结果，但能提前挡掉明显无效的文件，减少异步失败和无意义重试。

## 发布是商品与渠道的关系

商品状态和销售渠道发布不是同一个开关。`publishablePublish`、`publishableUnpublish` 操作的是商品与 Publication 之间的关系。

同步流程里应显式保存目标 Publication ID，并把发布动作放在商品、变体、库存和媒体完成之后。发布失败时只重试渠道关联，不要重新创建商品。

## 错误处理与权限

商品和媒体接入至少需要按实际操作申请 `read_products`、`write_products` 和 `write_files`。权限不足、字段不兼容和业务校验失败都会出现在 `userErrors`，HTTP 200 不能当作业务成功。

每次 mutation 都要同时检查：

- 顶层 GraphQL `errors`
- mutation 返回的 `userErrors`
- 返回对象的 ID 与状态
- 实际响应头中的 `X-Shopify-API-Version`

如果响应版本与请求的 `2026-07` 不一致，说明目标版本已经不可访问，Shopify 使用了回退版本。此时应停止批量同步，先核对版本兼容性。

## 适用范围

本文只讨论 Admin GraphQL API 2026-07，不覆盖 Storefront API。2026-07 的官方支持期到 2027-07-16，但 Shopify 建议每季度检查新版本和弃用项。

商店套餐、变体规模、API 成本和资源型限流都会影响批量策略。上线前要在开发店验证商品结构，再用接近真实规模的数据测试限流、重试和回放。

## 参考资料

- [Shopify API 版本机制](https://shopify.dev/docs/api/usage/versioning)
- [商品与集合模型](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections)
- [商品与集合媒体管理](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections/manage-media)
- [productSet](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/productSet)
- [productVariantsBulkUpdate](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/productVariantsBulkUpdate)
- [inventoryAdjustQuantities](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/inventoryAdjustQuantities)
- [productVariantAppendMedia](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/productVariantAppendMedia)
- [publishablePublish](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/publishablePublish)

## 随记

文末放一张一直留着的照片。2021 年学 WSL、折腾终端美化的时候，从少数派 SpencerWoo 的[《在 Windows 上用 WSL 开发的操作体验指北》](https://sspai.com/post/47719)里把它存了下来，后来做过一段时间屏保，原图的源头已经不可考。一只大鹅叼着微软 logo，理直气壮——像是一朵微光，让我对技术的学习一直保有热忱。

![一只叼着微软 logo 的大鹅](https://img.jimmy42x.com/images/2026/08/engineering/shopify-admin-graphql-product/goose.7135df02.webp)
