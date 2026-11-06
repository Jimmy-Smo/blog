---
title: API 调试：从调通一次，到留下可重复的回归
description: 用本地报价接口和 WireMock 跑通请求、关联号、上游超时与错误映射，把临时 curl 请求变成能反复执行的故障回归。
date: 2026-11-06T21:02:19+08:00
updated: 2026-11-06
topic: engineering
tags:
  - java
  - delivery
status: versioned
draft: false
---

接口调通后，只留下一张成功截图，下次换环境、改鉴权或调整超时，还得重新拼请求。截图里的结果没法再执行，也看不出当时请求经过了哪些依赖。

一次调试至少可以留下三样东西：可重放的请求、必要的响应断言，以及能稳定制造失败的上游替身。正常响应只能证明一条路通了，超时和错误响应才能检查失败之后怎么收场。

本文用一个本地报价示例串起这三样东西。示例固定使用 JDK 21、WireMock 3.13.1，核验日期为 2026-11-06。[代码与请求脚本](https://github.com/Jimmy-Smo/blog/tree/main/examples/backend-notes)随文章提供，不依赖真实业务系统。

## 先写清楚一条请求经过谁

示例的调用关系只有两跳：

```text
curl → 本地报价接口 /quote → WireMock /shipping-fee
```

上游成功时返回整数 `1299`，表示最小货币单位下的运费。本地接口把它包装成 `{"shippingFee":1299}`。本地接口访问上游的请求超时设为 300ms，固定返回规则如下：

| 上游行为 | 本地 HTTP 状态 | 本地响应 |
| --- | --- | --- |
| 200，正文是非负整数 | 200 | `{"shippingFee":1299}` |
| 响应延迟超过请求超时 | 504 | `{"code":"UPSTREAM_TIMEOUT"}` |
| 非 200，或正文无法解析 | 502 | `{"code":"UPSTREAM_ERROR"}` |

这里的状态码和错误码是示例自己的约定。它没有重试、鉴权、缓存和完整的业务校验，目的是把一次失败的传递过程看清楚。

## 把临时请求留成文件

进入示例目录后，先在一个终端启动模拟上游：

```bash
cd examples/backend-notes
mvn dependency:copy -Dartifact=org.wiremock:wiremock-standalone:3.13.1 \
  -DoutputDirectory=target
java -jar target/wiremock-standalone-3.13.1.jar \
  --port 8089 --bind-address 127.0.0.1
```

另一个终端编译并启动本地接口：

```bash
cd examples/backend-notes
mvn compile
UPSTREAM_URL=http://127.0.0.1:8089 PORT=8080 \
  java -cp target/classes blog.QuoteServer
```

两个服务都只监听本机。WireMock 的管理端点用于改写模拟响应，不能直接当成对外服务开放。

先给上游注册一条正常响应：

```bash
curl --fail-with-body -sS -X POST http://127.0.0.1:8089/__admin/mappings \
  -H 'Content-Type: application/json' \
  --data-binary @api/success.json
```

`api/success.json` 的完整内容是：

```json
{
  "request": { "method": "GET", "urlPath": "/shipping-fee" },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "text/plain" },
    "body": "1299"
  }
}
```

再请求自己的服务：

```bash
curl --fail-with-body -sS --max-time 5 \
  -H 'X-Request-Id: debug-001' http://127.0.0.1:8080/quote
```

`--data-binary @文件` 把请求体从命令历史里独立出来，方便评审和复用。真实项目里的 token、Cookie 和租户信息放到本地环境配置中，请求样例用虚构数据；分享请求时也要检查 URL 参数和响应内容。

换成 Bruno、Postman 或 IntelliJ HTTP Client，请求仍应保留同样的信息：环境入口、方法、路径、头和正文。工具可以换，能再次执行的请求才是留下来的东西。

## 用关联号对上两跳证据

示例接收 `X-Request-Id`，返回给调用方，并继续传到上游；发生上游超时或错误时，本地日志也打印这个编号。可以拿 `debug-001` 对照自己的响应头、本地日志和 WireMock 请求记录。

这只是演示关联号，不是完整链路追踪。真实系统里如果已经使用 W3C Trace Context 或 OpenTelemetry，应沿用现有传播机制，不要再造一套互不相认的编号。

如果 WireMock 没有收到请求，检查本地服务的上游地址和连接错误；如果它收到了请求，就继续比对路径、请求头与命中的映射。先确认请求走到了哪里，再判断是请求构造、连接、解析还是业务规则出了问题。

## 故意让上游慢下来

WireMock 支持给响应设置 `fixedDelayMilliseconds`。示例的超时映射只比正常映射多了一项：

```json
{
  "request": { "method": "GET", "urlPath": "/shipping-fee" },
  "response": {
    "status": 200,
    "body": "1299",
    "fixedDelayMilliseconds": 1500
  }
}
```

换场景之前，先删除前一个映射。否则相同路径存在多条规则时，还要额外解释优先级和匹配顺序。

```bash
curl --fail-with-body -sS -X DELETE http://127.0.0.1:8089/__admin/mappings
curl --fail-with-body -sS -X POST http://127.0.0.1:8089/__admin/mappings \
  -H 'Content-Type: application/json' \
  --data-binary @api/timeout.json
```

此时请求 `/quote`，预期收到 504 和 `UPSTREAM_TIMEOUT`。调用方的 `curl --max-time` 留了 5 秒，长于本地访问上游的 300ms 超时，便于观察服务自己的错误映射。若客户端先超时，你看到的就只是客户端中断，无法据此判断服务最终返回了什么。

这个例子没有精确计时断言。调度、连接建立和测试机器负载都会影响耗时，断言「必须在第 300ms 返回」容易造成无意义的波动。这里检查的是故障结果是否符合约定。

## 把断言也保存下来

完整的 `api/smoke.sh` 会依次安装正常、超时和上游 500 三种映射。每次都请求自己的 `/quote`，核对 HTTP 状态、JSON 内容和响应关联号；失败即返回非零退出码。

```bash
bash api/smoke.sh
```

这一步与直接请求 WireMock 有区别。WireMock 返回 500，只能证明模拟规则生效；自己的接口按约定返回 502，才验证到应用的错误处理。

进一步的 `QuoteServerIT` 会在测试进程里启动应用和模拟上游，使用动态端口，还覆盖非法运费正文以及关联号向上游传递。它可以通过 `mvn verify` 自动执行，避免 CI 依赖手工常驻的两个终端。测试分工见 [Java 测试分层](/blog/engineering/java-test-layers/)。

仍然需要单独验证真实上游的鉴权、证书、接口契约和限流行为。Mock 固定住的是已知场景，不能证明对方一直按这个样子工作。

## 参考资料

- [WireMock 独立进程运行方式](https://wiremock.org/docs/standalone/java-jar/)
- [WireMock 注册和管理映射](https://wiremock.org/docs/stubbing/)
- [WireMock 延迟与故障模拟](https://wiremock.org/docs/simulating-faults/)
- [WireMock 请求验证](https://wiremock.org/docs/verifying/)
