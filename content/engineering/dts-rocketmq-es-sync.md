---
title: MySQL 到 Elasticsearch 的同步链路设计：CDC、消息契约与回放
description: 设计并运维 DTS→RocketMQ→ES 数据同步链路，覆盖方案选型、消息契约、幂等重试、回放补数与可观测性
date: 2026-07-15
updated: 2026-08-29
tags:
  - engineering
  - elasticsearch
  - rocketmq
  - cdc
status: evergreen
draft: false
---

> 整理自 2025-07 至 2025-09 的项目实战笔记（条码/商品分页查询接入 ES 的完整链路）。

业务分页列表查询慢（多表 JOIN、大表模糊查询），需要把 MySQL 数据实时同步到 Elasticsearch 承接检索流量。设计这条链路时要回答四个问题：架构上经 MQ 中转还是直写、消息怎么定义才能长期演进、丢数据写失败需要补数时怎么办、链路健康怎么度量。

## 为什么中间多一跳 MQ

CDC（Change Data Capture）基于数据库 binlog/redo 日志捕获数据变更，不需要修改业务写入路径。它仍然依赖日志配置、读取权限、网络和同步资源。相比业务代码双写，CDC 能覆盖所有进入数据库并写入日志的变更，也不把同步逻辑塞进业务事务。

变更捕获之后怎么落到 ES，我选的是 **DTS（CDC）→ RocketMQ → ES Sink Consumer**：MQ 中转带来削峰（批量导入、刷数时变更洪峰由 MQ 缓冲，保护 ES）、多方消费（不同 ConsumerGroup 各自独立消费同一份变更流）和回放（按时间窗或 offset 重置位点即可补数，无需重新全量），代价是多一跳的运维复杂度。`DTS SDK → ES` 直写实现更简单，但容错和扩展性弱。

## 消息契约固定字段并版本化

消息契约固定字段为 `eventType / bizId / op / ts / traceId / payload`，并做版本化、保持向后兼容。下游消费方越多，契约越不能随手改。

## 幂等写入配指数退避与 DLQ

CDC 消息可能重复投递，ES 写入以文档主键做 upsert，需要处理顺序时再配外部版本号。“至少一次投递 + 幂等写”可以消除大部分重复写影响，但不等于端到端的恰好一次，乱序、版本冲突和写入后的其他副作用仍要单独处理。写入稳态参数：批量写入（bulk）+ 控制批量大小与刷新间隔；失败走指数退避（1s → 2s → 4s …，设上限与超时兜底）；重试耗尽进 DLQ（死信队列），配失败日志表便于重试与审计。

链路健康至少要看 TPS、消费堆积、失败率和 ES 写入耗时，再加一张同步失败日志表。需要核对业务时效时，还要记录源库变更时间与 ES 可查询时间的差值。

## 初始化与回放：快照全量 + 增量追赶

数据初始化用快照全量 + 增量追赶：全量阶段控制批量大小 / 并发 / refresh 策略（可临时调大 refresh_interval），增量阶段依赖 CDC 追平，追上后切读。事后补数可以按时间窗或 offset 回放，前提是目标消息仍在保留期内：

```text
定位时间窗 → 生成 offset/游标 → 幂等写 ES（主键或外部版本号）→ 核对指标/报表
```

一条完整链路包括 DTS 建链、ES 索引与 mapping/ILM、Sink Consumer、SearchService 抽象、回放补数和测试。当时项目按 5、7、10 天三档评估，最后选择了 **10 天**，历史兼容与联调占用的时间最多。

## 索引生命周期提前规划

ILM（Index Lifecycle Management）的热/温/冷分层与滚动索引策略，控制存储成本、稳定写入性能，索引设计阶段就要规划，不要等数据量上来再补。

## Topic 与 ConsumerGroup 规范

- Topic 命名：`<env>_<domain>_<entity>_<event>_topic`（团队约定统一用下划线）。
- **一组一责**：同组内实例负载均衡；不同职责拆不同 group，避免位点与幂等互相影响。一个 group 技术上可订阅多个 topic，但按职责拆分更清晰。
- group 以消费者职责命名，不复用。

## 已踩的坑

- 写放大：单条记录高频变更会放大 ES 写入，预研**窗口聚合**（合并短时间内同一主键的多次变更）。
- 分布式锁超时过短（3s）在高并发下获取失败率高，调整到 10s 后改善。锁租期要按业务耗时定。

## 适用范围

方案针对 MySQL + RocketMQ + Elasticsearch 组合；换成 Kafka/OpenSearch 思路一致，参数语义有差异。“DTS” 指云厂商数据传输服务（笔记场景为阿里云），自建可用 Canal/Debezium 替代，回放能力取决于所选组件。窗口聚合会引入秒级延迟，对实时性要求极高的场景需权衡。

## 参考资料

- 项目内联调与压测记录（2025-08，内部，已脱敏）
- [RocketMQ 消费幂等最佳实践](https://rocketmq.apache.org/docs/bestPractice/01bestpractice/)
- [Elasticsearch ILM 官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html)
