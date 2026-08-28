---
title: Kotlin + Spring Boot 后端工程实践清单
description: Kotlin 写 Spring Boot 业务代码的高频陷阱与既定做法：校验注解、可见性、ORM 空值、分布式锁与配置外部化
date: 2026-07-15
updated: 2026-07-15
tags:
  - java
  - kotlin
  - spring-boot
status: evergreen
draft: true
---

> 整理自 2025-06 至 2025-10 在 Kotlin 2.0 + JDK 21 + Spring Boot 3 + MyBatis Plus 3.5.9 项目中的实战笔记。

## 问题

Kotlin 写 Spring Boot 业务代码时，一批问题反复出现：校验注解不生效、可见性报错、懒加载异常、锁与重试组合不当、配置类与配置中心打架。本文把已验证的做法汇总成清单。

## 核心结论

- 校验注解必须用 **`@field:` 前缀**，且 `@DecimalMin` **不包含**空校验，要与 `@NotNull` 联用。
- 公共 API 签名**不暴露 `internal` 类型**，否则编译报 "exposed outside its visibility scope"。
- Repository 约定：单条返回 `Entity?`、多条返回 `List<Entity>`（空集合而非 null）。
- 分布式锁用 Redisson **`tryLock(timeout, leaseTime)`** 显式租期 + `finally` 解锁；重试用 `RetryTemplate`，且**先拿锁再重试**保证幂等。
- 配置优先级：**Nacos / `application*.yml` > 代码默认值**——只含硬编码默认值的 `@Configuration` 类应删除，避免与配置中心冲突。

## 原理

### `@field:` 为什么必须

Kotlin data class 的一个属性同时生成构造参数、字段、getter。不加 use-site target 时注解默认落在**构造参数**上，而 Bean Validation 读取的是**字段/getter**，所以校验静默失效：

```kotlin
data class Req(
  @field:NotNull
  @field:DecimalMin("0", inclusive = false)
  val price: BigDecimal?
)
```

可空性也要与校验一致：Jackson 反序列化走主构造器，声明为非空类型但 JSON 缺字段会在反序列化阶段抛错，而不是走到校验层。

### 事务与代理的失效场景

Spring 事务/重试基于代理，**类内部私有方法自调用不经过代理**，`@Transactional`/`@Retryable` 失效。解法：拆到新 Bean，或通过接口层调用。

### status 与 state

- `state`：内部状态机快照，细粒度、频繁变更；
- `status`：对外阶段标识（`PENDING/RUNNING/SUCCESS/FAILED`），稳定、可追踪。

对外接口暴露 `status`，内部流转用 `state`，两者不要混用一个字段。

## 实践与验证

### MyBatis Plus 使用约定

- 流式 API：`ktQuery().eq()` / `.in()` 统一风格；`last("limit 1")` 谨慎使用。
- 占位符**只用 `#{}`**（预编译，防注入）；`${}` 仅限动态表名等无法预编译的场景并需白名单校验。
- 局部字段更新走专用 `updateEntity`，隔离写路径并维护审计字段（`reviser/revised_time`）。
- 分页计数可启用 `OptimizeCountSql`（自动裁剪与计数无关的 SELECT 字段/LEFT JOIN），启用前对复杂 SQL 做 explain 验证。

### 锁 + 重试组合

```text
RetryTemplate.execute {
  lock.tryLock(waitTime, leaseTime) {   // 先锁
    幂等检查 → 业务逻辑                    // 再干活
  }
}
```

- Redisson 看门狗只在**不指定 leaseTime** 时生效；显式租期防止业务异常导致长期持锁。
- 锁超时按业务耗时定：曾因 3s 过短在高并发下大量获取失败，调到 10s 后恢复。
- MQ 消费侧手动 ack/nack + Redis 锁做幂等；重试次数用延迟队列/死信队列管理。

### 高频报错速查

| 现象 | 原因与修复 |
|------|-----------|
| 校验注解不生效 | 缺 `@field:` 前缀 |
| `exposed outside its defined visibility scope` | public 签名引用了 `internal` 类型，统一可见性 |
| Jimmer `UnloadedException` | 懒加载字段未取，用 Fetcher/Join 预取或显式选择字段 |
| `ReadOnlyBufferException` | `ByteBuffer.array()` 只对 `hasArray()` 的可写缓冲有效；只读缓冲用 `get(dst)` 或 `duplicate()` |
| 枚举反序列化失败 | 两端枚举同名同值，或以 code 传输 + 本地映射；新增枚举值注意兼容 |

### 配置外部化

- `Duration` 字段在 YAML 中写 `500ms` / `30s` / `5m` 或 ISO-8601 `PT30S`，**不要写 `0.5s`**；Spring Boot Binder 自动绑定。
- RabbitMQ 监听参数（`acknowledge-mode/prefetch/concurrency`）统一放 Nacos/`application*.yml`，运行时以 Environment 覆盖为准。
- Spring Cloud Gateway 路由的服务名**用短横线不用下划线**（部分匹配器对下划线兼容差）。

## 适用边界

- 版本基线：Kotlin 2.0、JDK 21、Spring Boot 3.x、MyBatis Plus 3.5.9、Redisson 3.x（2025 年下半年验证）。
- Jimmer 相关条目仅适用于使用 Jimmer ORM 的模块。
- `OptimizeCountSql` 在极端 SQL（含 DISTINCT、GROUP BY 的计数）与特定方言下需单独验证。

## 参考资料

- Kotlin use-site targets：https://kotlinlang.org/docs/annotations.html#annotation-use-site-targets
- Redisson 锁文档：https://github.com/redisson/redisson/wiki/8.-distributed-locks-and-synchronizers
- Spring Boot 外部化配置：https://docs.spring.io/spring-boot/reference/features/external-config.html
