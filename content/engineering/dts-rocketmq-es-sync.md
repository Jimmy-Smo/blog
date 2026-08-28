---
title: MySQL 到 Elasticsearch 的同步链路设计：CDC、消息契约与回放
description: 设计并运维 DTS→RocketMQ→ES 数据同步链路，覆盖方案选型、消息契约、幂等重试、回放补数与可观测性
date: 2026-07-15
updated: 2026-07-15
tags:
  - engineering
  - elasticsearch
  - rocketmq
  - cdc
status: evergreen
draft: true
---

> 整理自 2025-07 至 2025-09 的项目实战笔记（条码/商品分页查询接入 ES 的完整链路）。

## 问题

业务分页列表查询慢（多表 JOIN、大表模糊查询），需要把 MySQL 数据实时同步到 Elasticsearch 承接检索流量。要解决：

1. 同步架构怎么选（经 MQ 中转还是直写）？
2. 消息怎么定义才能长期演进？
3. 丢数据、写失败、需要补数时怎么办？
4. 链路健康怎么度量？

## 核心结论

- 采用 **DTS（CDC）→ RocketMQ → ES Sink Consumer** 链路：MQ 中转带来削峰、多消费方复用和回放能力，代价是多一跳的运维复杂度；`DTS SDK → ES` 直写实现更简单，但容错和扩展性弱。
- 消息契约固定字段：`eventType / bizId / op / ts / traceId / payload`，**版本化并保持向后兼容**。
- 写 ES 必须**幂等**（按主键或外部版本号），配 **指数退避重试 + DLQ（死信队列）**。
- 数据初始化用 **快照全量 + 增量追赶**；事后补数走 **时间窗/offset 回放**。
- 最低可观测要求：**TPS、失败率、ES 写入耗时** 三个指标 + 同步失败日志表。

## 原理

### CDC（Change Data Capture）

基于数据库 binlog/redo 日志实时捕获数据变更，对业务代码零侵入、延迟低，是向 ES/数据湖同步的标准姿势。相比业务代码双写，CDC 不会遗漏旁路写入，也不与业务事务耦合。

### 为什么要经过 MQ

- **削峰**：批量导入、刷数时变更洪峰由 MQ 缓冲，保护 ES；
- **多方消费**：不同 ConsumerGroup 各自独立消费同一份变更流；
- **回放**：按时间窗或 offset 重置位点即可补数，无需重新全量。

### 幂等写入

CDC 消息可能重复投递，ES 写入以文档主键（或外部版本号）做 upsert，保证"至少一次投递 + 幂等写"等效于恰好一次。

### ILM（Index Lifecycle Management）

热/温/冷分层与滚动索引策略，控制存储成本、稳定写入性能，索引设计阶段就要规划。

## 实践与验证

### Topic / ConsumerGroup 规范

- Topic 命名：`<env>_<domain>_<entity>_<event>_topic`（团队约定统一用下划线）。
- **一组一责**：同组内实例负载均衡；不同职责拆不同 group，避免位点与幂等互相影响。一个 group 技术上可订阅多个 topic，但按职责拆分更清晰。
- group 以消费者职责命名，不复用。

### 写入稳态参数

- 批量写入（bulk）+ 控制批量大小与刷新间隔；
- 失败走指数退避（1s → 2s → 4s …，设上限与超时兜底）；
- 重试耗尽进 DLQ，配失败日志表便于重试与审计。

### 回放 / 补数 SOP

```text
定位时间窗 → 生成 offset/游标 → 幂等写 ES（主键或外部版本号）→ 核对指标/报表
```

### 数据初始化

全量阶段控制 **批量大小 / 并发 / refresh 策略**（可临时调大 refresh_interval），增量阶段依赖 CDC 追平，追上后切读。

### 排期参考

一条完整链路（DTS 建链、ES 索引/mapping/ILM、Sink Consumer、SearchService 抽象、回放/补数、测试）实际评估 5/7/10 天三档时，**10 天更稳妥**——历史兼容与联调环节最容易超时。

### 已踩的坑

- 写放大：单条记录高频变更会放大 ES 写入，预研**窗口聚合**（合并短时间内同一主键的多次变更）。
- 分布式锁超时过短（3s）在高并发下获取失败率高，调整到 10s 后改善——锁租期要按业务耗时定。

## 适用边界

- 方案针对 MySQL + RocketMQ + Elasticsearch 组合；换成 Kafka/OpenSearch 思路一致，参数语义有差异。
- "DTS" 指云厂商数据传输服务（笔记场景为阿里云），自建可用 Canal/Debezium 替代，回放能力取决于所选组件。
- 窗口聚合会引入秒级延迟，对实时性要求极高的场景需权衡。

## 参考资料

- 项目内联调与压测记录（2025-08，内部，已脱敏）
- Elasticsearch ILM 官方文档：https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html
