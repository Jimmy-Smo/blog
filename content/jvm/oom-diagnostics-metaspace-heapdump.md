---
title: JVM OOM 排查：Metaspace 泄漏定位与 K8s 环境 HeapDump 采集
description: 在 Kubernetes 部署的 Java 服务上完成 OOM 取证与根因定位，覆盖 Metaspace 泄漏和堆内存 dump 采集 SOP
date: 2026-07-15
updated: 2026-07-15
tags:
  - jvm
  - kubernetes
status: evergreen
draft: false
---

> 整理自 2025-07 至 2025-10 的生产排障笔记。

## 问题

K8s 上的 Java 服务出现两类内存问题：

1. `OutOfMemoryError: Metaspace`，调大参数只能止血，需要定位谁在泄漏类；
2. 堆 OOM 后容器被重启，现场丢失，需要保证 dump 文件能落盘并被取走。

前置知识：JVM 内存分区（堆 / Metaspace）、K8s Volume 基本概念。

## 核心结论

- **Metaspace OOM 的根因几乎都是 ClassLoader 泄漏**（动态生成类、热加载、反射代理未释放）；调大 `MaxMetaspaceSize` 只是应急。
- **K8s 上 HeapDump 三要素**：OOM 时自动 dump 的 JVM 参数 + **可写挂载**（emptyDir/PVC）+ 告警联动"收集→下载→分析"的流程。
- 排查入口命令：`jps -lv` 看进程与启动参数，`jcmd` 系列看类加载统计。

## 原理

### Metaspace 为什么会泄漏

Metaspace 存放类元数据，随 ClassLoader 生命周期释放。只要 ClassLoader 被引用链持有（缓存、静态字段、线程上下文），它加载的所有类的元数据都无法回收。高发场景：

- 框架**动态生成类**（CGLIB 代理、Groovy 脚本、表达式引擎）且无缓存上限；
- **热部署/热加载**反复创建新 ClassLoader，旧的未释放；
- 反射/代理对象缓存 key 里握着 ClassLoader 引用。

### 为什么 dump 路径必须是挂载卷

容器文件系统随 Pod 重启销毁；OOM 恰恰常触发重启。dump 写到 `emptyDir`（Pod 内共享、重启容器可保留）或 PVC（持久化）才能在事后取到。

## 实践与验证

### K8s HeapDump 配置范式

JVM 参数：

```bash
-XX:+HeapDumpOnOutOfMemoryError \
-XX:HeapDumpPath=/heapdumps
```

Pod 挂载：

```yaml
volumes:
  - name: heapdump
    emptyDir: {}          # 需要跨 Pod 持久化则用 PVC
containers:
  - name: app
    volumeMounts:
      - name: heapdump
        mountPath: /heapdumps
```

检查项：目录**可写**、**容量足够**（dump 大小≈堆大小）、OOM 告警里附带 dump 采集链路。

### Metaspace 排查路径

1. **止血**（争取排查时间，不是修复）：

   ```bash
   -XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m
   ```

2. **定位泄漏的 ClassLoader**：

   ```bash
   jcmd <pid> VM.classloader_stats     # 各 ClassLoader 加载类数与占用
   jmap -clstats <pid>                 # ClassLoader 统计（旧版 JDK）
   jcmd <pid> GC.class_histogram       # 类实例直方图，找异常增长的类
   ```

   关注：数量持续增长的 ClassLoader、名字带 `$$`/`Proxy`/`GeneratedClass` 的动态类。

3. **修复**：给动态类生成加缓存上限；热加载场景确认旧 ClassLoader 无引用残留；升级已知泄漏的依赖。

### 日常监控入口

```bash
jps -lv          # 列出 Java 进程 + 启动参数（确认 dump 参数已生效）
```

结合容器指标（CPU、内存工作集、重启次数）判断短板；OOM 重启次数上升是最早的信号。

## 适用边界

- 命令以 **JDK 11+ 的 `jcmd`** 为主；`jmap -clstats` 在新版 JDK 中已被 `jcmd VM.classloader_stats` 取代。
- `emptyDir` 在 **Pod 被驱逐/删除时同样丢失**，重要现场用 PVC。
- 止血参数的数值（256m/512m）是经验值，应按实际类加载规模调整。

## 参考资料

- JVM 排障工具 `jcmd` 文档：https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html
- Kubernetes Volumes：https://kubernetes.io/docs/concepts/storage/volumes/
