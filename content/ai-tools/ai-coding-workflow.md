---
title: AI 编程工具选型与工作流：Cursor、Claude Code、Copilot 组合实践
description: 帮助 Java/Kotlin 后端开发者选择并组合 AI 编程工具，覆盖选型维度、无头模式、子代理、MCP 配置与安全边界
date: 2026-07-15
updated: 2026-08-29
tags:
  - ai-tools
  - claude-code
  - cursor
status: versioned
draft: false
---

> 整理自 2025-06 至 2025-10 的学习笔记。工具能力与价格变化极快，本文事实核验日期为笔记记录当时（2025 年下半年），使用前应重新核对官方文档。

AI 编程工具数量多、迭代快，追着每个新功能跑是跑不过来的。我的做法是先把三件事想清楚：按什么维度评估一个工具、它在现有工作流里占哪个位置、以及怎么把它接进 CI 和脚本这类非交互场景并守住安全边界。这三条线定了，新工具出现时只需要重新填格子。

## 选型先看五个维度

评估一个工具，我固定看五个维度：IDE/Terminal 的集成方式、团队协作能力（Code Review、子代理）、隐私与日志留存、速度与推理质量、成本。2025 年下半年的记录里，主流工具定价大致是每人每月 $20 到 100；各家模型的消息条数上限等配额在年内多次调整，比较时以官方帮助页当日内容为准。

## 四个工具各占一个生态位

组合的价值不在工具多，而在各占一个不重叠的生态位。我在 Java/Kotlin & Spring Boot 后端场景下的分工是：

- Cursor：本地上下文、语义搜索、多轮改写；
- Claude Code：长上下文、子代理（代码审查、文档重写）、终端与结构化指令链；
- Copilot：行内补全与测试样例骨架；
- ChatGPT：架构讨论、脚本/SQL/正则的一次性生成与核对。

工具一多，任务、笔记、复盘就容易碎片化。与其为每个工具单独维护一套记录，不如把它们整合进统一的流程。

## 上下文掌控力是本质差异

我在 2025 年使用“Copilot + ChatGPT 对话式生成”时，项目上下文主要靠手动粘贴；Cursor、Claude Code 这类工具可以直接导航文件树、跨文件修改并执行结构化指令链，操作连贯性更好。上下文工程（Context Engineering）处理的也是这些问题：怎样裁剪上下文、接入检索与工具、管理记忆窗口，这些选择会影响幻觉率与任务稳定性。

## 子代理与无头模式

Claude Code 的子代理把一个专业子任务（如代码审查、文档翻译）派发给独立的代理执行，主对话保持干净上下文，适合“任务目标明确、产出可验收”的场景。

无头模式解决的是非交互场景：用 `-p` 参数进入，适用于 CI、pre-commit 钩子、构建脚本；配合 `--output-format stream-json` 可获得流式 JSON 输出，便于程序消费。

## 配置落地：项目规则、安装与 MCP

Cursor 的项目规则放在 `.cursor/rules`，本来就是供团队共享和版本控制的；`CLAUDE.md` 如果记录项目命令与团队约定，也应该提交。用户级偏好留在各自的设置里，含密钥、账号或内部信息的内容不要写进规则文件。`.cursorignore` 控制哪些文件不进入 Cursor 上下文，不等同于 Git 的 `.gitignore`。

Claude Code 安装：

```bash
npm install -g @anthropic-ai/claude-code
claude doctor
```

Node 环境建议用 nvm 管理（`nvm install --lts`），安装路径统一在用户级 Node 下，避免权限问题。

Codex 的 MCP 服务用 TOML 分段表写法，避免在内联表里换行：

```toml
[mcp_servers.deepwiki]
url = "https://mcp.deepwiki.com/mcp"
```

远程 HTTP 服务只配置 `url`；本地 stdio 服务才使用 `command`，并要确保启动命令在 PATH 中，必要时改用绝对路径。

## coding agents 的安全边界

把代理接进工作流之前，先过一遍安全清单。风险面集中在四处：供应链注入、工具权限边界、提示注入、数据外泄。对策是**最小权限工具链**加**沙箱隔离**，配全链路审计。落地动作有两件：为代理梳理允许调用的工具白名单；敏感操作（推送、删除、外发）保留人工确认。

## 适用范围

组合建议针对 Java/Kotlin 后端加 macOS/WSL 开发环境，前端或数据科学场景的权重会不同。子代理和无头模式的能力以 Claude Code 当前版本文档为准。

## 参考资料

- [Context Engineering for AI Agents（Manus）](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Coding Agents 安全（宝玉译）](https://baoyu.io/translations/llms-coding-agents-security-nightmare)
- [Cursor Project Rules](https://docs.cursor.com/context/rules-for-ai)
- [Claude Code CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage)
- [Codex configuration reference](https://developers.openai.com/codex/config-file/config-reference)
- [Using Codex with your ChatGPT plan - OpenAI Help](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
