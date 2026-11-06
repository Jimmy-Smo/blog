---
title: Kotlin + Spring Boot 后端工程实践清单
description: Kotlin 写 Spring Boot 业务代码的高频陷阱与既定做法：校验注解、可见性、ORM 空值、分布式锁与配置外部化
date: 2026-07-15
updated: 2026-11-06
topic: engineering
tags:
  - java
  - kotlin
  - spring-boot
status: versioned
draft: false
---

> 整理自 2025-06 至 2025-10 在 Kotlin 2.0 + JDK 21 + Spring Boot 3 + MyBatis Plus 3.5.9 项目中的实战笔记。

Kotlin 写 Spring Boot 业务代码，同一批问题会反复出现：校验注解不生效、可见性报错、懒加载异常、锁与重试组合不当、配置类与配置中心打架。这篇把已验证的做法按主题汇总成清单。

## Kotlin 2.0 中显式指定校验注解的位置

Kotlin 主构造器中的属性可能对应构造参数、字段和 getter。在本文的 Kotlin 2.0 基线下，适用多个位置的校验注解可能优先落到构造参数，常规 Bean 属性校验就读不到它。这里显式用 `@field:` 把约束放到字段上；选择 getter 校验时也可以用 `@get:`，不是所有场景都只能选字段：

```kotlin
data class Req(
  @field:NotNull
  @field:DecimalMin("0", inclusive = false)
  val price: BigDecimal?
)
```

Kotlin 2.2 引入了新的注解默认目标规则，具体行为还受编译器选项影响。升级时应重新检查字节码或校验结果，不能把 Kotlin 2.0 的默认行为套到所有版本。

两点补充：`@DecimalMin` 本身不拒绝空值，需要拒绝空值时再与 `@NotNull` 联用；注解的位置也不能代替 Controller 入口启用校验。启用 Jackson Kotlin 模块、按主构造器反序列化时，非空引用字段缺失可能先在反序列化阶段报错，要把这类错误与 Bean Validation 的失败分开处理。

## 事务与重试经不起类内自调用

在 Spring 默认的代理模式下，同一个对象通过 `this` 调用自身方法，会绕过代理，`@Transactional` 和 Spring Retry 的 `@Retryable` 拦截就不会执行。私有方法也不能靠代理拦截。通常把需要拦截的方法拆到另一个 Bean，再通过注入的代理调用；仅仅抽出一个接口、仍然在对象内部调用，并不能解决问题。编程式的事务或 `RetryTemplate` 则是另一种显式控制方式。

## state 与 status 分开用

下面是项目里的命名约定，不是两个英文单词的强制定义：`state` 是内部状态机快照，细粒度、频繁变更；`status` 是对外阶段标识（`PENDING/RUNNING/SUCCESS/FAILED`），稳定、可追踪。对外接口暴露 `status`，内部流转用 `state`，两者不要混用一个字段。

## MyBatis Plus 的使用约定

- 流式 API：`ktQuery().eq()` / `.in()` 统一风格；`last("limit 1")` 谨慎使用。
- 占位符只用 `#{}`（预编译，防注入）；`${}` 仅限动态表名等无法预编译的场景，并需白名单校验。
- Repository 返回约定：单条返回 `Entity?`，多条返回 `List<Entity>`（空集合而非 null）。
- 局部字段更新集中到项目自己的更新方法中，隔离写路径并维护审计字段。旧笔记里的 `updateEntity` 是项目封装，不是可以直接照抄的 MyBatis Plus 通用 API。
- MyBatis Plus 的 `Page.optimizeCountSql` 与 `optimizeJoinOfCountSql` 默认开启，后者可能移除不参与 WHERE 条件的 LEFT JOIN。复杂 SQL 要检查生成的 count SQL 和总数，不能只看数据查询的 explain。

## 先定义拿锁失败算什么，再写重试

旧示意代码只写了 `if (lock.tryLock(...))`。返回 `false` 时没有失败分支，回调就正常结束了；`RetryTemplate` 不会因为「没有执行到业务」自动再试。

如果约定锁竞争可以重试，需要把它表达成明确异常，并只把这类异常放进重试策略。下面把锁操作抽成回调，完整实现与可执行检查放在 [示例目录](https://github.com/Jimmy-Smo/blog/tree/main/examples/kotlin-retry-lock)：

```kotlin
class LockBusyException : RuntimeException("lock busy")

val retry = RetryTemplate.builder()
    .maxAttempts(3)
    .fixedBackoff(10)
    .retryOn(LockBusyException::class.java)
    .build()

fun <T> retryWithLock(
    retry: RetryTemplate,
    tryAcquire: () -> Boolean,
    release: () -> Unit,
    action: () -> T
): T = retry.execute<T, Exception> {
    val acquired = try {
        tryAcquire()
    } catch (e: InterruptedException) {
        Thread.currentThread().interrupt()
        throw e
    }
    if (!acquired) throw LockBusyException()
    try {
        action()
    } finally {
        release()
    }
}
```

`maxAttempts(3)` 包含第一次尝试。参数只是为了让示例快速结束，不是线上推荐值。拿不到锁时不解锁；拿到锁后，无论业务成功还是抛错都进入释放分支。中断恢复线程标记并向外传播，不当作锁竞争继续尝试。业务异常也不会被这个仅重试 `LockBusyException` 的策略无差别重试；该异常类型应留给拿锁失败使用。

接 Redisson 时，可以把 `tryAcquire` 适配到 `lock.tryLock(waitTime, leaseTime, unit)`，把 `release` 适配到 `lock.unlock()`，业务回调中先做持久化幂等检查。示例的检查使用锁替身，验证的是重试与释放分支，没有验证 Redis 网络故障、互斥性或租期行为。

还要分清两个时间：`waitTime` 是等待获取锁的上限，`leaseTime` 是拿到锁之后的租期。指定租期后不能指望看门狗替你无限续期；业务超过租期时，互斥保护可能已经失效，后续解锁也可能报错。旧记录里「从 3s 调到 10s 后改善」没有明确区分这两个参数，不能据此推导应该统一调大哪个值。应分别测锁等待和持锁耗时，再决定重试、租期与续期方案。

MQ 消费侧的 Redis 锁只能减少并发重复处理，不能代替持久化幂等记录。业务写入成功但 ack 前崩溃，消息仍可能再次投递。应用内重试和 MQ 重新投递还可能叠加，需要一起限制总尝试次数和耗时。

## 高频报错速查

公共 API 签名不要暴露 `internal` 类型，`exposed outside its defined visibility scope` 这类报错统一可见性即可解决。其余高频报错对表：

| 现象 | 原因与修复 |
|------|-----------|
| 校验注解不生效 | 缺 `@field:` 前缀 |
| `exposed outside its defined visibility scope` | public 签名引用了 `internal` 类型，统一可见性 |
| Jimmer `UnloadedException` | 懒加载字段未取，用 Fetcher/Join 预取或显式选择字段 |
| `ReadOnlyBufferException` | `ByteBuffer.array()` 只对 `hasArray()` 的可写缓冲有效；只读缓冲可用 `duplicate().get(dst)` 读出剩余字节；`duplicate()` 仍保留只读属性，不能让 `array()` 变得可用 |
| 枚举反序列化失败 | 两端枚举同名同值，或以 code 传输 + 本地映射；新增枚举值注意兼容 |

## 配置外部化

- 先确认参数有没有通过 `@ConfigurationProperties`、`@Value` 或其他机制读取配置。外部配置不能自动覆盖一个在自定义工厂方法里写死的值。Nacos 与本地配置的优先级还取决于接入版本和加载方式，应核对实际 PropertySource 与最终绑定值；不要仅因存在 `@Configuration` 就删除配置类。
- `Duration` 字段在 YAML 中写 `500ms` / `30s` / `5m` 或 ISO-8601 `PT30S`，本文采用 `500ms` 表达半秒，ISO 格式也可写 `PT0.5S`。本次用 Spring Boot 3.5.9 的 `DurationStyle` 检查，`0.5s` 被拒绝，`500ms` 与 `PT0.5S` 均得到半秒；不要据此推断其他绑定器也使用相同规则。
- RabbitMQ 监听参数可以集中到外部配置，但要确认实际使用的容器工厂是否绑定这些属性。自定义工厂里手动设置的参数，不会仅因 YAML 写了同名属性就被替换。
- 名称里使用短横线是项目约定。排查 Gateway 时，要区分路由 ID、服务发现名与目标 URI 的 host，不能把某个环节的下划线问题推广成所有名称都不支持。

## 适用范围

版本基线为 Kotlin 2.0、JDK 21、Spring Boot 3.x、MyBatis Plus 3.5.9、Redisson 3.x（旧记录来自 2025 年下半年）。本次于 2026-11-06 对照官方文档修正机制说明；重试分支另以 Kotlin 2.0.21、Spring Retry 2.0.12 做本地检查。Jimmer 相关条目仅适用于使用 Jimmer ORM 的模块；`OptimizeCountSql` 在极端 SQL（含 DISTINCT、GROUP BY 的计数）与特定方言下需单独验证。

## 参考资料

- [Kotlin use-site targets](https://kotlinlang.org/docs/annotations.html#annotation-use-site-targets)
- [MyBatis Plus 分页插件](https://baomidou.com/plugins/pagination/)
- [Redisson 分布式锁与同步器文档](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)
- [Spring Boot 外部化配置](https://docs.spring.io/spring-boot/reference/features/external-config.html)

- [Spring Retry：RetryTemplate 与重试策略](https://github.com/spring-attic/spring-retry#using-retrytemplate)
- [Kotlin 2.2 注解默认目标规则](https://kotlinlang.org/docs/whatsnew22.html#new-defaulting-rules-for-use-site-annotation-targets)
- [Spring 代理机制与自调用](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html)
