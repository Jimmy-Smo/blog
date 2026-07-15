# TIL: 使用 gh 命令行高效 clone GitHub 仓库

> 归档说明：这是旧版按日期记录的学习笔记，内容未按当前发布标准重新核验。

- 学会了 `gh repo clone` 的用法：一行命令直接拉取远程仓库到本地，自动创建目录。
- 遇到已存在同名目录时，会提示报错，需要手动删除或更换目录。
- 体验到 CLI 工具带来的高效和目录管理的重要性。
- 了解仓库默认下载路径为当前终端所在目录，必须先切换到目标文件夹再执行 clone，避免目录混乱。
- 掌握了查看和替换本地 Git 仓库远程地址（remote url）的方法，确保推送和拉取指向正确仓库。
- 熟悉 GitHub CLI 登录流程，优先推荐“浏览器登录”，简化身份认证，无需手动 Token。
- 体会到用 CLI 管理 GitHub 仓库远比网页操作高效，适合多仓库、多项目管理。

# TIL: Gradle Wrapper 镜像加速及版本管理

- 理解 Gradle Wrapper 确保团队构建环境一致，无需依赖本地安装 Gradle。
- 发现官方 Gradle 镜像在国内访问缓慢，学会替换 `gradle-wrapper.properties` 中的 `distributionUrl` 为国内镜像（阿里云、清华）。
- 识别阿里云镜像目录结构调整，需带版本号子目录，如 `/distributions/v8.14.2/`。
- 明白镜像同步存在滞后，选择镜像已有的稳定版本使用。
- 了解如何查看和调整 Gradle Wrapper 版本。

# TIL: Kotlin + Spring Boot + Gradle 项目初始化

- 通过 Spring Initializr 快速生成 Kotlin + Spring Boot + Gradle 项目骨架，选择 JDK 21 和合适依赖。
- 理解包名命名规范，避免下划线和官方保留名，推荐全小写点分隔格式，如 `io.github.jimmy.aiedgecasegen`。
- 认识 IntelliJ IDEA 是 Kotlin + Spring Boot 的首选开发工具，体验优于 VS Code。
- 掌握项目生成后执行 `./gradlew build` 验证环境搭建成功。

# TIL: Git 仓库管理与项目覆盖风险

- 意识到解压覆盖项目可能导致 `.git` 目录被覆盖，丢失版本信息。
- 学会重新初始化 Git 仓库并关联远程地址，恢复版本管理。
- 建议备份 `.git` 目录以防止意外丢失。
- 明白初期项目阶段覆盖问题可快速修复，后期开发需谨慎操作。

---

今日学习涵盖了从工具链配置、项目初始化、版本管理到环境优化的全流程实践，显著提升了工程化能力与实战经验。
