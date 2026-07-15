---
title: 🧠 学习笔记（2025‑06‑30 ~ 2025‑07‑01）
date: 2025‑07‑01
status: archived
description: Mac 开发环境配置、WSL 性能分析、Claude Code 与 VSCode 整合、Node.js 与 nvm 管理
---

> **时间窗口**：2025‑06‑30 00:00 — 2025‑07-01 23:59  
> **关键词**：Mac M4 性能评估、WSL 效率瓶颈、Node/npm 版本管理、Claude Code 实战接入

---

## 1. Mac mini (M4) 开发环境体验评估

### 1.1 编译性能测试对比
- 项目对比测试显示：Mac mini M4 编译同一 Java 项目仅需 **1 分钟内**，而 Windows AMD 6800H 需 **5 分钟以上**
- 体现 Apple Silicon 架构在代码编译、热启动场景下对 Java/Kotlin 的原生性能优势

### 1.2 设备购入判断
- **参考价格**：M4+32G+512G 版，教育优惠+国补下来，6500
- **评估逻辑**：
  - 用于夜间 Cursor + Claude 学习、写作场景最优
  - 不建议升级 M4 Pro / 48G RAM，理由：价格增幅过大（接近 2 万）且任务未饱和

---

## 2. WSL 开发环境瓶颈分析

### 2.1 性能问题定位
- 发现 VSCode 打开 Windows Java 项目，通过 WSL2 编译时：
  - WSL 占用高达 **5G 内存 + 50% CPU**
  - 即使关闭 Cursor 后，资源未自动释放
- 原因可能包括：
  - 项目在挂载路径（/mnt/c/...）下 I/O 性能差
  - WSL 线程常驻、未按预期回收

### 2.2 解决建议
- 项目建议 clone 到 WSL 内部，如 `~/code`
- 用 VSCode Remote WSL 打开，避免 Windows↔WSL 文件系统穿透开销
- Gradle 缓存也应设在 Linux 目录下

---

## 3. Claude Code + VSCode 实战连接调试

### 3.1 安装流程梳理
```bash
npm install -g @anthropic-ai/claude-code
```
- 已确认 VSCode 可打开 WSL 项目并成功接入 Claude Code 后端
- 安装路径统一在 WSL 内部 Node 环境下管理

### 3.2 问题解决：
- WSL 中普通用户权限问题已排查；
- 通过使用 `nvm` 成功安装 Node 22.17.0 + npm 10.9.2，并准备升级至 npm 11.4.2

---

## 4. Node.js / npm / nvm 管理最佳实践

### 4.1 安装步骤（WSL 环境）
```bash
nvm install --lts
nvm use --lts
```
- Node 路径验证：
```bash
which node
which npm
node -v
npm -v
```
- 默认路径：`~/.nvm/versions/node/...`

### 4.2 升级 npm 到最新版
```bash
npm install -g npm@11.4.2
```
> **建议**：如遇 `npm fund` 提示可忽略，主要关注版本升级即可

---

## 5. 其他要点 & 工具碎片
- `WSL git config --global credential.helper` 建议使用 cache + timeout：
  ```bash
  git config --global credential.helper 'cache --timeout=604800'
  ```

---

## 6. 下一步行动计划（Next Steps）

- [ ] 完成 Claude Code 的 Java + Python 实战测试（单文件/多文件/目录处理）
- [ ] 调研 VSCode AI 插件与 Claude Code 的配合能力（Context 深度 / 插件支持）
- [ ] Python 基础知识学习，JVM 内容学习

---

**Embrace performance. Optimize flow. Simplify systems.** ⚙️
