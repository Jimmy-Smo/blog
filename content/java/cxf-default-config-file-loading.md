---
title: CXF 启动时如何默认加载 classpath 根下的 cxf.xml
description: 记录一次源码追踪，并修正当年对调用链的判断：默认用户配置 cxf.xml 由 CXF 的 BusApplicationContext 加载。
date: 2021-05-24
updated: 2026-09-05
tags:
  - java
  - webservice
status: versioned
draft: false
---

老项目里有个服务是用 CXF 暴露的。配置写在 `cxf.xml` 里，项目代码里却找不到任何读取这个文件的地方。想来这是约定，读取逻辑应该在 JAR 包里。

## 先说结论

在这类基于 Spring 的 CXF 配置中，启动过程会刷新 `BusApplicationContext`。Spring 负责应用上下文的刷新流程，CXF 则在 `BusApplicationContext#getConfigResources()` 里决定加载哪些配置资源。

没有显式指定用户配置时，CXF 会读取 `Configurer.DEFAULT_USER_CFG_FILE`，它的值是 `cxf.xml`。`findResource()` 会先把这个名字当作 classpath 资源查找，因此文件通常放在 classpath 根目录。这里还要区分另一个框架默认配置：`BusApplicationContext.DEFAULT_CXF_CFG_FILE` 的值是 `META-INF/cxf/cxf.xml`。两者不是同一个文件。

## 怎么定位到的

一开始直接看 `web.xml` 配的 servlet：`org.apache.cxf.transport.servlet.CXFServlet`。光看方法名不够敏感，胡乱找了一通还是没找到。

后来改看启动日志。这个项目启动的第一行是：

`o.a.c.b.spring.BusApplicationContext - Refreshing org.apache.cxf.bus.spring.BusApplicationContext`

`BusApplicationContext` 的刷新过程会进入 Spring 的上下文生命周期。顺着调用栈时，我把断点停在了 `AbstractApplicationContext#prepareRefresh()`，当年因此误以为默认文件名也定义在 Spring 里。重新核对源码后，真正选择配置资源的是 CXF 覆写的 `BusApplicationContext#getConfigResources()`：先检查 `cxf.config.file`，没有显式配置时再回退到 `Configurer.DEFAULT_USER_CFG_FILE`。

![CXF 启动调用栈](https://img.jimmy42x.com/images/2026/09/java/cxf-default-config-file-loading/cxf-startup-call-stack.db224dec.webp)

![定义在 jar 包中的默认配置项文件地址](https://img.jimmy42x.com/images/2026/09/java/cxf-default-config-file-loading/cxf-default-config-in-jar.c2cd6bbf.webp)

一开始用「CXF 默认配置项」去搜，出来的都是怎么写这个 `cxf.xml`，不是框架自己怎么找到它。关键字还得再练。这个结论在 2026 年重新核对源码时做了修正，原来的截图和排查过程保留下来，当作一次历史记录。

## 参考

- [Apache CXF：BusApplicationContext.java](https://github.com/apache/cxf/blob/main/core/src/main/java/org/apache/cxf/bus/spring/BusApplicationContext.java)
- [Apache CXF：Configurer.java](https://github.com/apache/cxf/blob/main/core/src/main/java/org/apache/cxf/configuration/Configurer.java)
- 2021 年原文：<https://www.cnblogs.com/Jimmy-cnblog/p/14804292.html>
