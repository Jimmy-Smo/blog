---
title: Java 测试分层：别让每个测试都启动 Spring
description: 用一个可运行的 Maven 示例分开单元测试与 HTTP 集成测试，再按失败信号选择普通 JUnit、Spring 测试切片或完整应用上下文。
date: 2026-11-06T21:02:19+08:00
updated: 2026-11-06
topic: engineering
tags:
  - java
  - spring-boot
status: versioned
draft: false
---

测一个金额计算方法，却要先等 Spring 启动、连接数据库、初始化消息队列。测试还没执行断言，就可能因为数据库没开而失败。这样的失败告诉不了你金额算得对不对。

拆测试时，先问它需要证明什么。计算规则只需要输入和输出；HTTP 客户端需要真的收发请求；事务边界则需要相应的数据库和事务管理器。给每种问题配上足够的环境，失败才容易解释。

本文示例固定使用 JDK 21、JUnit Jupiter 5.11.4、Surefire / Failsafe 3.5.4，Spring 部分对照 3.5.9 文档，核验日期为 2026-11-06。它们是示例基线，不代表最新版本。[完整示例](https://github.com/Jimmy-Smo/blog/tree/main/examples/backend-notes)与本文一起维护。

## 计算规则可以直接 new

金额用最小货币单位的整数表示，例如分。这个类没有网络和数据库依赖：

```java
public final class PriceCalculator {
    public long total(long unitPrice, int quantity) {
        if (unitPrice < 0 || quantity < 0) {
            throw new IllegalArgumentException("price and quantity must be nonnegative");
        }
        return Math.multiplyExact(unitPrice, (long) quantity);
    }
}
```

直接实例化，就能测空购物车、正常数量、负值与溢出。下面是其中两个测试，省略了包名和 import：

```java
class PriceCalculatorTest {
    private final PriceCalculator calculator = new PriceCalculator();

    @Test void totalsIntegerMinorUnits() {
        assertEquals(5997, calculator.total(1999, 3));
    }

    @Test void reportsOverflowInsteadOfWrapping() {
        assertThrows(ArithmeticException.class,
            () -> calculator.total(Long.MAX_VALUE, 2));
    }
}
```

`Math.multiplyExact` 会在超出 `long` 范围时抛异常。测试把这个行为固定下来，避免溢出后悄悄得到另一个金额。这里没有 Bean 装配、事务或序列化需要验证，启动 Spring 只会额外引入失败原因。

如果计算必须依赖时间，可以把 `Clock` 传进去；需要费率，就把费率或查询费率的接口传进去。先让业务输入显式可控，再考虑要不要 Mock。把一个方法内部的每次调用都断言一遍，往往会让测试跟着重构一起碎掉。

## 用 Maven 阶段把两类反馈分开

示例把测试都放在 `src/test/java`，用类名区分：普通测试叫 `PriceCalculatorTest`，HTTP 集成测试叫 `QuoteServerIT`。

在没有额外配置的情况下，Surefire 默认识别 `Test*`、`*Test`、`*Tests`、`*TestCase` 等模式；Failsafe 默认识别 `IT*`、`*IT`、`*ITCase`。这里使用的 `*Test` 和 `*IT` 不重叠。已有项目如果改过 includes / excludes，就需要按实际配置重新核对。

Failsafe 还需要绑定到构建生命周期。在 `pom.xml` 的 `build/plugins` 中配置：

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.5.4</version>
</plugin>
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-failsafe-plugin</artifactId>
  <version>3.5.4</version>
  <executions>
    <execution>
      <goals>
        <goal>integration-test</goal>
        <goal>verify</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

这段配置只负责执行分工。JUnit 依赖、Java 编译版本等仍然需要配置，完整 POM 见示例目录。

```bash
cd examples/backend-notes
mvn clean test
mvn verify
```

第一条只走到 `test` 阶段，第二条继续走到集成测试及其结果校验。`verify` 会再次执行前面的测试阶段，并非只跑集成测试。

不要把 CI 命令停在 `mvn integration-test`。Failsafe 把测试失败的最终检查留给 `verify`，这样 `post-integration-test` 阶段还有机会清理环境。少了结果校验，构建退出状态可能无法表达集成测试是否失败。[Maven 官方说明](https://maven.apache.org/surefire/maven-failsafe-plugin/usage.html)也建议调用 `verify`。

另外，`@Tag("integration")` 只是 JUnit 标签。没有配过滤规则时，它不会自动把测试挪给 Failsafe。

## 集成测试要真的经过那个集成点

示例的 `QuoteServerIT` 启动本地 HTTP 服务和 WireMock，端口都由操作系统动态分配。请求经过自己的 `/quote` 接口，再访问模拟上游 `/shipping-fee`，断言正常响应、超时、上游错误和非法返回值。

它能验证 HTTP 请求、状态码映射和关联号传递，不能证明真实供应商接口可用，也没有测数据库事务。Mock 替代了哪一段，测试边界就到哪一段为止。

实例资源在每个测试后关闭，测试自己创建数据，不依赖前一个测试留下的状态。固定端口、共享文件和共享数据库记录，都可能让「单独跑能过」变成「一起跑随机失败」。先消除这些共享状态，再开并行。

## Spring 测试也可以缩小范围

落到 Spring Boot 项目，可以按需要验证的行为选择范围：

| 要证明什么 | 可以从哪里开始 |
| --- | --- |
| 纯计算、参数边界、状态转移 | 普通 JUnit，直接实例化 |
| JSON 字段名、日期或枚举的序列化 | `@JsonTest` |
| Controller 参数绑定、校验、响应 | `@WebMvcTest`，补上需要的协作者 |
| JPA 映射与持久化行为 | `@DataJpaTest`，确认实际使用的数据库 |
| 多个组件的完整装配 | `@SpringBootTest` |

测试切片仍可能加载 Spring 上下文，只是范围较小。`@SpringBootTest` 也不必然启动真实 HTTP 端口，是否启动取决于 `webEnvironment` 等配置。

对 MySQL 方言、锁和事务隔离的判断，要放到匹配的数据库环境里验证。H2 跑通不能证明 MySQL 下的行为相同。切片缩小了应用范围，不会替你消除数据库差异。

## 示例实际检查了什么

示例目录同时包含本文、[API 调试回归](/blog/engineering/api-debugging-regression/)和 [Excel 图片导入](/blog/engineering/excel-picture-import/)的代码。

`mvn clean test` 执行金额计算和图片索引的普通测试；`mvn verify` 还会执行四个 HTTP 集成测试和一个工作簿文件往返测试。后者实际读写 `.xlsx` 文件，也归到集成测试，而不因为没有网络就算成纯单测。报告分别位于 `target/surefire-reports` 和 `target/failsafe-reports`。查看报告中的测试类和数量，比只看最后一行 `BUILD SUCCESS` 更能确认自己到底测到了什么。

这个示例不包含 Spring Boot 应用、真实数据库或性能基准。Spring 部分讲的是如何选择测试范围，相关注解需放回自己的应用与版本中验证。

## 参考资料

- [Surefire 默认测试类匹配规则](https://maven.apache.org/surefire/maven-surefire-plugin/examples/inclusion-exclusion.html)
- [Failsafe 默认测试类匹配规则](https://maven.apache.org/surefire/maven-failsafe-plugin/examples/inclusion-exclusion.html)
- [Failsafe 生命周期与 verify](https://maven.apache.org/surefire/maven-failsafe-plugin/usage.html)
- [Spring Boot 3.5.9 测试文档源码](https://github.com/spring-projects/spring-boot/blob/v3.5.9/spring-boot-project/spring-boot-docs/src/docs/antora/modules/reference/pages/testing/spring-boot-applications.adoc)
