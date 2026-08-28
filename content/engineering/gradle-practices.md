---
title: Gradle 8.x 构建实践：Wrapper、Daemon 与缓存排错
description: 固定 Gradle 版本和下载来源，理清 Daemon 的 JVM 选择，并用可恢复的方式处理依赖与缓存问题
date: 2026-07-15
updated: 2026-08-28
tags:
  - engineering
  - gradle
  - build
status: versioned
draft: false
---

> 整理自 2025-06 至 2025-10 的构建记录，实际环境为 Gradle 8.9 至 8.14。Gradle 9 的行为应以对应版本文档为准。

Gradle 构建出问题时，我通常先确认三件事：项目到底用了哪个 Gradle、Daemon 跑在哪个 JDK 上、依赖是没下载到还是缓存状态不对。顺着这三条线查，比一上来清空整个 `~/.gradle` 更容易找到原因。

## 项目版本只认 Wrapper

项目里的 `gradlew`、`gradlew.bat`、`gradle-wrapper.jar` 和 `gradle-wrapper.properties` 应一起提交。开发机和 CI 都运行 `./gradlew`，本机单独安装的 Gradle 版本不参与项目构建。

升级版本时优先运行 Wrapper 任务：

```bash
./gradlew wrapper --gradle-version 8.14.3 --distribution-type bin
./gradlew wrapper
./gradlew --version
```

第二次执行会更新 Wrapper 脚本和 JAR。`bin` 只包含运行构建需要的文件，下载和 CI 缓存都更小；确实需要离线查看 Gradle 源码和文档时再用 `all`。

IDE 里也要选择项目 Wrapper，并让 Gradle JVM 与团队约定一致。否则终端能构建、IDE 同步失败，最后查到的往往只是两边用了不同的 JDK 或 Gradle。

## 下载源要能验证

默认发行包来自 `services.gradle.org`。网络条件不稳定时，可以把发行包放进公司内网的制品库，再通过 Wrapper 任务写入完整地址：

```bash
./gradlew wrapper \
  --gradle-distribution-url https://<company-artifact-host>/gradle-8.14.3-bin.zip \
  --gradle-distribution-sha256-sum <sha256>
```

公开镜像的目录结构、同步进度和维护状态都可能变化，不适合把某个镜像地址当作长期结论。无论用官方地址还是内部代理，都应固定版本，并用官方校验值或内部发布流程生成的 SHA-256 校验发行包。

依赖仓库和插件仓库也要统一。公司有 Nexus 或其他制品代理时，把入口放在 `settings.gradle.kts`，凭据从环境变量或 Gradle 用户级配置读取，不写进仓库。

## Single-use Daemon 不一定是故障

构建里出现下面这句，表示 Gradle 为当前构建启动了一个用完即停的 Daemon：

```text
To honour the JVM settings for this build a single-use Daemon process will be forked.
```

常见原因是启动 Wrapper 的客户端 JVM 与构建要求的 JVM 参数不兼容。排查时对照这些位置：

- `JAVA_HOME` 与终端里的 `java -version`
- IDE 设置的 Gradle JVM
- `gradle.properties` 中的 `org.gradle.jvmargs`
- 项目使用的 Java toolchain

Gradle 只会复用 Java home、版本和 JVM 参数都兼容的 Daemon。多个位置各配一套 JDK，通常会多起几个进程，也会让 IDE 和命令行表现不一致。

```bash
./gradlew --status
./gradlew --stop
./gradlew help --no-daemon --stacktrace
```

`--stop` 适合在排查异常状态时重启 Daemon，`--no-daemon` 适合做对照，不建议因为一次故障长期关闭 Daemon。

## 缓存先刷新，不要整库删除

Gradle 会定期清理没有继续使用的版本缓存、下载文件和 Daemon 日志。磁盘增长不等于必须手动删除整个 `~/.gradle/caches`。

依赖解析异常时，可以按下面的顺序处理：

1. 先看 `--stacktrace`，确认是网络、仓库元数据、校验失败还是插件兼容问题。
2. 停掉当前版本的 Daemon，再用 `--refresh-dependencies` 重新校验依赖缓存。
3. 只处理报错指向的项目缓存、版本目录或 Wrapper 发行包目录，移动到备份位置后再重试。
4. 构建恢复后再删除备份，避免一次清理让所有项目重新下载依赖。

```bash
./gradlew --stop
./gradlew build --refresh-dependencies --stacktrace
```

CI 上更不应该把全量清缓存当成固定步骤。缓存没有跨不可信分支共享、缓存键包含 Wrapper 和依赖定义、构建能够在无缓存环境重跑，通常就够了。

## 升级后先分清是谁不兼容

跨小版本升级后出现 `InvalidUserCodeException` 或弃用警告，不要先把插件从 `settings.gradle.kts` 挪到其他位置碰碰运气。先用 `--warning-mode all` 找到触发位置，再检查插件是否支持目标 Gradle 版本。

```bash
./gradlew build --warning-mode all --stacktrace
```

如果报错来自第三方插件，优先升级插件或回退 Gradle。临时改放置位置只能算绕过，需要在文章、提交说明或问题记录里写清适用版本，避免后来的人把它当成固定配置。

## 几个常用入口

```bash
./gradlew dependencies --configuration runtimeClasspath
./gradlew dependencyInsight --dependency <name> --configuration runtimeClasspath
./gradlew build --offline
./gradlew properties
```

`--offline` 只适合缓存已经准备好的环境。它能区分“构建逻辑有问题”和“当前网络或仓库不可用”，不能替代正常的依赖解析。

## 适用范围

本文以 Gradle 8.9 至 8.14 为基线。Gradle 9 调整了 Wrapper 版本格式、Daemon JVM 与部分弃用行为，升级时应按目标版本重新跑完整构建与测试。

第三方插件、公司仓库和 IDE 都可能改变最终行为。文章里的顺序适合作为排查入口，具体结论仍要以当前项目的 Wrapper、构建日志和依赖来源为准。

## 参考资料

- [Gradle 8.14.3 Wrapper](https://docs.gradle.org/8.14.3/userguide/gradle_wrapper.html)
- [Gradle 8.14.3 Daemon](https://docs.gradle.org/8.14.3/userguide/gradle_daemon.html)
- [Gradle 8.14.3 目录与缓存](https://docs.gradle.org/8.14.3/userguide/directory_layout.html)
- [Gradle 8 升级指南](https://docs.gradle.org/8.14.3/userguide/upgrading_version_8.html)
