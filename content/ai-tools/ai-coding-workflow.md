---
title: AI 编程工具选型与工作流：Cursor、Claude Code、Copilot 组合实践
description: 帮助 Java/Kotlin 后端开发者选择并组合 AI 编程工具，覆盖选型维度、无头模式、子代理、MCP 配置与安全边界
date: 2026-07-15
updated: 2026-07-15
tags:
  - ai-tools
  - claude-code
  - cursor
  - workflow
status: versioned
draft: true
---

> 整理自 2025-06 至 2025-10 的学习笔记。工具能力与价格变化极快，本文事实核验日期为笔记记录当时（2025 年下半年），使用前应重新核对官方文档。

## 问题

AI 编程工具数量多、迭代快，"Copilot + ChatGPT 对话式生成"的旧工作流已明显落后于 AI 原生 IDE 工作流。需要回答三个问题：

1. 按什么维度评估这些工具？
2. Java/Kotlin & Spring Boot 后端场景下如何组合使用？
3. 如何把工具接入 CI、脚本等非交互场景，同时守住安全边界？

## 核心结论

- **选型维度**：IDE/Terminal 集成方式、团队协作能力（Code Review、子代理）、隐私与日志留存、速度与推理质量、成本（2025 年主流区间 $20–100/人·月）。
- **组合建议（Java/Kotlin & Spring Boot）**：
  - **Cursor**：本地上下文、语义搜索、多轮改写；
  - **Claude Code**：长上下文、子代理（代码审查、文档重写）、终端与结构化指令链；
  - **Copilot**：行内补全与测试样例骨架；
  - **ChatGPT**：架构讨论、脚本/SQL/正则的一次性生成与核对。
- 工具组合的价值不在"多"，而在各占一个不重叠的生态位；碎片化工具应整合进统一的任务、笔记、复盘流程。

## 原理

### 为什么 AI 原生 IDE 工作流优于对话式生成

对话式工具（网页版 ChatGPT）只能拿到你粘贴的片段；Cursor/Claude Code 拥有文件树导航、跨文件重写、结构化指令链，**上下文掌控力和操作连贯性**是本质差异。上下文工程（Context Engineering）的核心也在此：上下文裁剪、检索与工具接入、记忆窗管理，直接决定幻觉率与任务稳定性。

### 子代理（sub-agent）

Claude Code 的子代理把一个专业子任务（如代码审查、文档翻译）派发给独立的代理执行，主对话保持干净上下文。适合"任务目标明确、产出可验收"的场景。

### 无头模式（Headless Mode）

Claude Code 使用 `-p` 参数进入无头模式，适用于 CI、pre-commit 钩子、构建脚本等非交互场景；配合 `--output-format stream-json` 可获得流式 JSON 输出，便于程序消费。

## 实践与验证

### Cursor 项目配置

避免把 Cursor 私有配置提交进 Git：

```text
# .gitignore 追加
.cursorignore
.cursor/
CLAUDE.md
```

### Claude Code 安装（WSL / macOS 通用）

```bash
npm install -g @anthropic-ai/claude-code
```

Node 环境建议用 nvm 管理（`nvm install --lts`），安装路径统一在用户级 Node 下，避免权限问题。

### MCP 服务配置（Codex 示例，TOML）

TOML 中使用分段表写法，避免在内联表里换行：

```toml
[mcp_servers.deepwiki]
command = "http"
url = "https://mcp.deepwiki.com/mcp"
trust_level = "trusted"
```

排错要点：报 "No such file or directory" 时确认 `command` 在 PATH 中，必要时改绝对路径。

### Coding Agents 安全清单

来自对 coding agents 安全风险的梳理：

- 风险面：供应链注入、工具权限边界、提示注入、数据外泄；
- 对策：**最小权限工具链** + **沙箱隔离** + 全链路审计；
- 落地动作：为代理梳理允许调用的工具白名单，敏感操作（推送、删除、外发）保留人工确认。

## 适用边界

- 工具版本、定价、配额（如各家模型的消息条数上限）在 2025 年内多次调整，**所有数字必须以官方帮助页当日内容为准**。
- 组合建议针对 Java/Kotlin 后端 + macOS/WSL 开发环境；前端或数据科学场景的权重会不同。
- 子代理和无头模式的能力以 Claude Code 当前版本文档为准。

## 参考资料

- Context Engineering for AI Agents（Manus）：https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
- Coding Agents 安全（宝玉译）：https://baoyu.io/translations/llms-coding-agents-security-nightmare
- OpenAI Help - Using Codex with your ChatGPT plan：https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
