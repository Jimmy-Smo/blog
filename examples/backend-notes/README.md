# 后端文章的最小示例

对应三篇文章：

- [Java 测试分层](https://jimmy42x.com/blog/engineering/java-test-layers/)
- [API 调试回归](https://jimmy42x.com/blog/engineering/api-debugging-regression/)
- [Excel 图片导入](https://jimmy42x.com/blog/engineering/excel-picture-import/)

固定基线：JDK 21、Maven 3.9.x、JUnit Jupiter 5.11.4、Surefire / Failsafe 3.5.4、WireMock 3.13.1、Apache POI 5.4.1。不是生产项目模板。

## 测试

```bash
mvn clean test
mvn verify
```

`test` 运行 8 个普通测试（金额 5 个、图片索引规则 3 个）。`verify` 还运行 4 个 HTTP 集成测试和 1 个工作簿文件往返测试；测试使用动态端口，自动关闭服务。结果位于 `target/surefire-reports` 和 `target/failsafe-reports`。

图片测试在临时目录生成小型工作簿，验证复用图片、横向合并、空编码、纵向合并和跨工作表归属。测试结束后自动清理，没有提交图片或工作簿二进制。

## 手工 API 调试

在此目录执行。终端一：

```bash
mvn dependency:copy -Dartifact=org.wiremock:wiremock-standalone:3.13.1 -DoutputDirectory=target
java -jar target/wiremock-standalone-3.13.1.jar --port 8089 --bind-address 127.0.0.1
```

终端二：

```bash
mvn compile
UPSTREAM_URL=http://127.0.0.1:8089 PORT=8080 java -cp target/classes blog.QuoteServer
```

终端三（需要 curl、jq）：

```bash
bash api/smoke.sh
```

脚本切换成功、上游超时、上游 500 三种映射，并向自己的 `/quote` 发请求；核对状态、响应 JSON 和关联号。它会删除本地 8089 端口模拟服务的现有映射，请使用专用实例。完成后在两个服务终端按 Ctrl+C。

## 范围

- `PriceCalculator`：整数金额的输入、负数及溢出边界，无 Spring。
- `QuoteServer`：本机 HTTP 转发示例，无真实鉴权、数据库、重试或完整追踪。上游正文是整数运费，不是任意供应商 JSON。
- `PictureIndex`：小型固定模板 `.xlsx` 的浮动图片索引。第一行为表头，A 列为编码，B 列为图片；仅支持有单元格锚点的直接图片对象。横向合并归一到左上角，纵向合并及分组绘图拒绝。不是大文件流式导入器，也没有实现业务行完整性校验或文件上传。
