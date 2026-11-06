---
title: AI 编程工作流：一份指令文件，几个终端 Agent
description: 从 IDE 插件各占一格，到几个终端 Agent 共用一份 AGENTS.md：指令文件怎么写一次到处用，无头模式怎么进脚本和 CI，权限边界划在哪。
date: 2026-07-15
updated: 2026-11-06
topic: ai
tags:
  - claude-code
status: versioned
draft: false
---

> 2026-11-06 重写。命令、参数和文件约定核验于 2026-11-06 的官方文档：Claude Code 2.1.x、Codex CLI、Cursor、GitHub Copilot。这类工具几个月就变一轮，照抄前先对一遍文档。

这篇的上一版写于 2025 年下半年，思路是给每个工具找一个不重叠的生态位：Cursor 管本地上下文和多轮改写，Claude Code 管长上下文和终端，Copilot 管行内补全，ChatGPT 管讨论和一次性脚本。一年后回头看，「各占一格」这个思路还成立，格子却变了。

主力从 IDE 插件挪到了终端。我现在机器上装着 Claude Code、Codex、Grok Build 和 Pi，没再装 Cursor。工具多了以后，真正要维护的不再是每个工具各自的设置，而是一份它们都认的指令文件。

## 选型还是看那五个维度

评估一个新工具，我仍然看五件事：怎么接进现有环境（IDE 还是终端），能不能分派子任务和做代码审查，日志和数据留在哪，速度和推理质量，成本。

这一年多出来一个维度：它认不认仓库里已有的指令文件。认的话，换工具几乎没有迁移成本；不认，就得为它单独再写一套规矩，而且迟早和别的那几套对不上。

## 指令只写一份：AGENTS.md

`AGENTS.md` 现在是几家共同的约定。Codex 构建项目指令时直接读它。Cursor 支持项目根目录和子目录里的 `AGENTS.md`。GitHub Copilot 也认，目录树里离当前文件最近的那份优先。Claude Code 的主文件是 `CLAUDE.md`，但可以用 `@路径` 把别的文件导入进来，文档里也写明了可以直接用现成的 `AGENTS.md`。

所以这个博客仓库的 `CLAUDE.md` 基本是空的，正文只有一行导入：

```markdown
Project instructions are shared with other agents and live in AGENTS.md:

@AGENTS.md
```

规则全写在 `AGENTS.md` 里：常用命令、目录结构、哪些不变量不能动、提交信息格式。Claude Code 通过导入读到，Codex 和其他工具直接读到，改一处全部生效。

全局层也是同一个办法。`~/.claude/CLAUDE.md` 只有一行 `@~/.codex/AGENTS.md`，个人偏好（比如搜索用 `rg`、JSON 用 `jq`）只维护在 Codex 那份文件里。Skills 放在 `~/.agents/skills/`，再用软链接挂到 `~/.claude/skills/` 下面，两边看到的是同一批文件。

指令文件里写什么，标准很简单：写读代码读不出来的东西。项目命令、踩过的坑、「这个配置不要随手改」。目录树、依赖列表这类模型自己能查到的，不用抄进去。Claude Code 的文档建议单个 `CLAUDE.md` 控制在 200 行以内，太长会占上下文，遵循度反而下降。导入只是方便拆文件，被导入的内容一样会全部加载。

工具专属的格式还在，适合放只对它有意义的配置：Cursor 的 `.cursor/rules/*.mdc` 可以按文件类型限定规则的生效范围，Copilot 有 `.github/copilot-instructions.md`。通用规则放 `AGENTS.md`，专属规则放各自的位置，不要两边各抄一份。

## 子代理和无头模式

子代理的用法没变：把一个目标明确、结果能验收的子任务（审一段 diff、在一堆文件里定位某个调用）派给独立的上下文去做，主对话只拿回结论。它省的是主对话的上下文，不是时间。

无头模式是 AI 工具真正进入工程流程的入口。Claude Code 用 `-p` 跑非交互模式，退出码表示成败，可以直接放进脚本：

```bash
# 把 diff 喂进去做一次拼写检查, 不需要给它 Bash 权限
git diff main | claude -p "找出这段 diff 里的拼写错误，每条输出 文件名:行号 和问题"

# 要给程序消费时用 JSON, 结果在 .result 字段
claude -p "总结这个项目的模块划分" --output-format json | jq -r '.result'
```

`--output-format` 有 `text`、`json`、`stream-json` 三种。需要固定结构的输出，可以加 `--json-schema`，结果会放在 `structured_output` 字段里。

放进 CI 时我会加两样东西。一是 `--bare`：它跳过本机和仓库里的 hooks、skills、MCP 配置和 `CLAUDE.md` 的自动加载，每台机器跑出来的行为一致。文档说它以后会成为 `-p` 的默认行为。代价是它不读订阅登录，要配 `ANTHROPIC_API_KEY`。二是显式的权限：用 `--allowedTools` 只放行需要的工具，Bash 命令按前缀放行。

```bash
claude -p "看一下暂存区的改动，写一条合适的提交信息并提交" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status *),Bash(git commit *)"
```

`Bash(git diff *)` 里星号前面的空格不能省，没有它，`git diff-index` 这类命令也会被匹配上。

## 安装与 MCP

Claude Code 现在推荐用原生安装器，装完会在后台自动更新：

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude --version
claude doctor   # 只读诊断：安装状态、设置文件校验、自动更新结果
```

也可以用 `brew install --cask claude-code`。npm 包还能用（需要 Node.js 22 以上），装下来的是同一个原生二进制。上一版写的「用 nvm 管 Node、npm 全局安装」现在不必了。不管用哪种方式，都不要 `sudo` 安装，否则它没法自己更新。

Codex 的 MCP 配置写在 `~/.codex/config.toml`，每个服务一个 `[mcp_servers.<名字>]` 表。远程 HTTP 服务只写 `url`，本地 stdio 服务写 `command` 和 `args`：

```toml
[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"

[mcp_servers.local-tool]
command = "/usr/local/bin/some-mcp-server"
args = ["--stdio"]
```

stdio 服务的启动命令要确保在 PATH 里，拿不准就写绝对路径。Claude Code 这边，项目级的 MCP 服务放在仓库根目录的 `.mcp.json`，可以提交，团队共用。

## 安全边界

风险还是那四处：供应链注入、工具权限过宽、提示注入、数据外泄。这一年变的是，工具开始给出具体的开关，不用只靠自觉。

有一点容易被忽略：Claude Code 在 `-p` 模式下没有工作区信任确认，会照常执行仓库 `.claude/settings.json` 里的 hooks，连上 `.mcp.json` 里的服务器，哪怕这个目录你从来没信任过。在 CI 里跑别人提交的代码，就是在跑别人写的 hooks。`--bare` 能挡住这一层。

剩下的照旧：给 Agent 的工具列白名单；推送、删除、往外发内容这类操作保留人工确认；CI 里用 `--permission-mode dontAsk`，没有明确放行的操作一律拒绝，不要等一个永远不会来的确认。指令文件里也别写密钥、账号和内部地址，它要提交进仓库，公开仓库更是谁都能看。

## 适用范围

组合方式针对 Java/Kotlin 后端加 macOS 开发环境，IDE 是 IntelliJ IDEA，AI 主要跑在终端里。这篇只讲单个 Agent 怎么配；同时跑好几个 Agent、用 worktree 隔离并行任务，见 [从一个 Agent 到一组 Agent](/blog/ai-tools/multi-agent-development/)。前端或数据场景，IDE 内的工具权重会更高。各家 CLI 的参数以当前版本文档为准，本文只核验了上面列出的那些。

## 参考资料

- [Claude Code：高级安装与更新](https://code.claude.com/docs/en/setup)
- [Claude Code：以编程方式运行（`-p`、`--bare`、权限）](https://code.claude.com/docs/en/headless)
- [Claude Code：CLAUDE.md、导入与 AGENTS.md](https://code.claude.com/docs/en/memory)
- [Codex 配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Cursor：Rules 与 AGENTS.md](https://cursor.com/docs/context/rules)
- [GitHub Copilot：仓库自定义指令](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [Context Engineering for AI Agents（Manus）](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Coding Agents 安全（宝玉译）](https://baoyu.io/translations/llms-coding-agents-security-nightmare)
