---
title: 🧠 学习笔记（2025‑07‑02 ~ 2025‑07‑06）
date: 2025‑07‑07
status: archived
description: Cursor 与 Claude Code 深度调研、Mac Mini M4 配置及性能优化、Kotlin 项目环境搭建、Python 学习进展与心态复盘
---

> **时间窗口**：2025‑07‑01 00:00 — 2025‑07‑07 00:52  
> **关键词**：Cursor、Claude Code、macOS、M4 性能调优、Kotlin 项目搭建、学习心态

---

## 1. Cursor 与 Claude Code 深入调研与实践

### 1.1 工具链与 IDE 集成
- 深入理解 Cursor 与 Claude Code 的优势：
  - 相较 Copilot 更贴近 IDE 内原生工作流。
  - 已规划使用 Cursor+Claude 替代原有的 Copilot+ChatGPT 工具链。

### 1.2 Cursor 使用技巧积累
- 掌握 Cursor 命令菜单（`Cmd+K`）与文件结构导航。
- 已确定 `.cursorignore` 文件配置（避免上传 Cursor 配置到 Git）。
  ```text
  .cursorignore
  .cursor/
  CLAUDE.md
  ```
  
---

## 2. Mac mini M4 开发环境搭建与性能优化

### 2.1 Mac mini M4 性能表现
- 新购入 Mac mini M4 (32GB RAM + 512GB SSD)：
  - 价格合理（用原有的键盘鼠标显示器）。
  - 性能显著提升，编译速度相比 Windows AMD 6800H 快 5 倍以上。
  - 已正式投入 Kotlin 项目环境搭建（Gradle + JDK21）。
---

## 3. Kotlin 项目环境搭建（SpringBoot + Gradle）

### 3.1 项目技术栈
- Kotlin 2.0 + JDK 21 + SpringBoot 3 + MyBatis Plus 3.5.9 + MySQL 8.3。
- Gradle 性能调优设置：
  ```properties
  # 降低 JVM 内存需求（微服务场景）
  -Xmx4G -Xms1G
  ```
  
### 3.2 MyBatis Plus 最佳实践
- 持续使用推荐的 Repository 接口设计模式：
  - 单查询返回 `Entity?`，多查询返回 `List<Entity>`。
  - `ktQuery().eq()` 与 `.in()` 方法统一使用。
  - 使用 Kotlin 数据类，字段注释和非空类型（`@field:NotNull`）。

---

## 4. Python 学习进展

- 短期内投入不足：
  - 菜鸟教程基础内容简单浏览。
  - 后续明确计划需提升投入时长及深度（自动化脚本、数据分析等场景）。

---

## 5. 工具与效率技巧碎片积累

### 5.1 Surge 代理规则技巧
- SLS 模糊查询规则：
  ```bash
  _container_name_: service-name and content: xxx*
  ```

### 5.2 VSCode 快捷键配置（类 IDEA 快速文件定位）
- 快速搜索文件：`Cmd + P`（MacOS）

### 5.3 Sublime Text 跳转技巧
- 类似 IDEA 的光标跳转功能（Ctrl+Backspace）暂未找到完美对应，后续继续探索插件支持。

---

## 6. 日常学习状态与心态复盘

### 6.1 状态管理
- 持续保持每周跑步频率（3次），固定午睡习惯稳定状态。
- 新工具（Mac Mini 环境搭建）投入耗费较长时间

### 6.2 惯性问题反思
- 每天有效学习时间较短（午休、晚上各约半小时到1小时），后续考虑结构化安排。

### 6.3 心态调整与社会比较
- 再次强调不被朋友圈“高光时刻”影响，专注自我成长。
- 已养成每周复盘习惯，记录进展和问题，强化自我掌控感。

---

## 7. 下一步待办（Next Steps）

- [ ] 深入实践 Cursor + Claude Code，尤其代码生成与项目内导航。
- [ ] 提升 Python 学习投入强度，实践自动化脚本案例。
- [ ] 明确结构化学习时间规划（尤其晚间碎片时间的高效利用）。

---

**Reflect clearly. Execute efficiently.** 🚀
