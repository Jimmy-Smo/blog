# 拿锁失败如何触发 Spring Retry

对应 [Kotlin + Spring Boot 工程实践清单](https://jimmy42x.com/blog/java/kotlin-spring-engineering-notes/)。

基线：JDK 21、Kotlin CLI 2.0.21、Spring Retry 2.0.12、Spring Core 6.2.12、Maven 3.9.x。此目录用 Maven 解析依赖，用 Kotlin CLI 编译检查程序；不是 Spring Boot 工程模板。

```bash
bash verify.sh
```

可以在末尾传 Maven 参数，例如 `bash verify.sh -Dmaven.repo.local=/tmp/retry-demo-repository`。

五组检查：旧代码正常返回只执行一次；第三次拿锁成功才执行业务；重试耗尽不解锁；业务异常原样传播并释放锁；中断不重试且恢复线程标记。

锁由回调替身提供，只验证 RetryTemplate、失败分支和释放次数。没有启动 Redis，没有验证 Redisson 的锁互斥、看门狗或租期，也没有模拟解锁自身失败。接真实锁时必须分别验证这些行为，并用持久化机制保证业务幂等。
