---
title: 从一个 Agent 到一组 Agent：开发者怎么管并行的编程 Agent
description: 开发者的问题从用好一个 Agent 变成同时跑好几个：worktree 隔离、谁来调度、Orca 这类编排工具什么时候值得上，以及审查为什么成了新瓶颈。
date: 2026-11-06T19:38:14+08:00
topic: ai
tags:
  - agent
status: versioned
draft: false
---

> 产品名单、功能和命令核验于 2026-11-06。这一块每个月都在变，文中提到的工具使用前请对照官方文档。

今年 7 月写《AI 开发者生态的五层》时，我关心的问题是怎么把一个 CLI 用稳：模型选哪家，网络和账号怎么配。四个月后再看，那篇里的问题没有消失，但已经不是重点了。

现在的问题是怎么同时管好几个：一边做需求一边修 bug，或者两个需求并行推进，每个都交给一个 Agent。这篇只讲开发者手上的这一层。Agent 再多下去会分成哪几种形态、它们之间怎么联系，我另写在 [Agent 多起来以后，它们得互相说话](/blog/ai-tools/agents-need-to-talk/) 里。

## 一个 checkout 装不下两个 Agent

最朴素的场景是这样：一个需求做到一半，线上报了个 bug。以前要么 stash 掉手头的改动去修，要么等需求做完再说。现在可以让一个 Agent 继续做需求，再开一个去修 bug。问题在于，两个 Agent 不能在同一个工作目录里改文件，否则改动会互相踩。

所以多 Agent 并行的地基是 git worktree：同一个仓库检出多个工作目录，各自在自己的分支上，共享同一份提交历史。每个 Agent 一个 worktree，改动天然隔离，做完各自提 PR 或合并。

## 谁来调度：三种程度

在 worktree 之上，按「人管多少」可以分成三种做法。

**人当调度员。** 每个任务开一个 worktree，起一个会话，自己在几个会话之间切换。Claude Code 用 `claude --worktree <名字>` 直接在 `.claude/worktrees/<名字>/` 下建好 worktree 和分支，换个终端再起一个就是第二个任务。Codex 现在已经并进了 ChatGPT，线程同样可以选在本地、独立的 worktree 或云端运行。

**交给后台，回头再看。** 任务派出去以后不盯着，需要你的时候它再找你。Claude Code 的 `claude agents` 打开一个总览界面（目前是 research preview），列出所有后台会话在干什么、哪个在等你；派出去的会话动手改文件前会自己挪进 worktree。Codex 的云端线程跑在 OpenAI 的服务器上，电脑关了也能继续。

**让 Agent 调度 Agent。** 主会话自己拆任务、派给子代理、收结果。Claude Code 的子代理可以各自跑在独立的 worktree 里；`/batch` 把一个大改动拆给 5 到 30 个子代理并行做；agent teams 让一个主会话带着几个会话分工协作，有共享的任务列表，目前还是实验功能，默认关闭。

我现在用的是前两种，都是 CLI 自带的能力，还没上独立的编排工具。

## worktree 用起来的几个坑

worktree 是全新的检出，`node_modules`、`.env` 这些被 gitignore 的东西都不在里面。依赖要重新装一遍；`.env` 这类文件可以写进 Claude Code 的 `.worktreeinclude`（语法和 `.gitignore` 一样），新建 worktree 时会自动复制过去。

起点分支要想清楚。Claude Code 默认从远端默认分支（通常是 `main`）切出新 worktree，修线上 bug 正合适；要在手头未推送的工作上继续，得把 `worktree.baseRef` 设成 `"head"`。

清理别指望全自动。交互式会话退出时，有改动的 worktree 会问你留不留；`-p` 跑出来的 worktree 不会自动清理，要自己 `git worktree remove`，被锁住的先 `git worktree unlock`。

agent teams 不给成员分配 worktree，几个成员会在同一个目录里改文件。用它的时候要按文件划清每个成员负责的范围。

最后是成本：几个 Agent 同时跑，token 用量就是几倍。

## Orca 这一类：跨厂商的编排界面

CLI 自带的并行只管自家的 Agent。如果你同时用 Claude Code、Codex 和别的工具，就会出现一类新工具：专门管多个编程 Agent 的桌面应用。

[Orca](https://www.onorca.dev/) 是其中一个，开源（MIT），有 macOS、Windows 和 Linux 版。它给每个 Agent 开一个独立的 worktree，支持 Claude Code、Codex、OpenCode、Grok、Gemini、Cursor、Copilot 等二十多种 CLI Agent，也能接任意命令行 Agent。界面上把 Agent、终端、浏览器和 diff 分屏放在一起，可以在 diff 上直接写评论发回给 Agent，还有协调者 Agent 带着工作 Agent 干活。手机端会在某个 Agent 等你输入时推送通知，可以直接在手机上回复。

同类的还有只支持 macOS 的 [Conductor](https://www.conductor.build/)，以及原公司在 2026 年 4 月关停、现由社区维护的 Vibe Kanban。终端里的轻量做法有 Claude Squad。

什么时候值得上这一层？我的判断是三种情况：混用好几家的 Agent，想要一个统一的 diff 审查界面，或者需要离开电脑时也能回应 Agent。只用一家的话，CLI 自带的功能已经够用。这一层我还没实际用过，以上只是根据各家文档整理的。

## 并行之后，人的工作变成了审查

几个 Agent 同时干活，写代码不再是瓶颈，瓶颈换成了审查：三个 Agent 并行，就是三份 diff 等你看。并行度能开多大，取决于你审得过来多少，而不是机器跑得动多少。

让审查跟得上，靠的还是老办法。任务要彼此独立，最好不碰同一批文件。每个任务要有能自动验证的结果，测试能跑过，比读一遍 diff 可靠。任务要切得小，一个 Agent 一次只做一件事。

还有一件事变得更重要：仓库里的指令文件。每个 worktree、每个 Agent 读到的都是同一份 `AGENTS.md`，规矩写清楚了，几个 Agent 的产出风格才对得上，审查起来也省力。指令文件怎么写一份给多个工具用、无头模式和权限怎么配，我在 [AI 编程工作流：一份指令文件，几个终端 Agent](/blog/ai-tools/ai-coding-workflow/) 里写过，并行之后这些设置不变，只是同一套规矩同时管着好几个 Agent。

## 没有覆盖的

Orca、Conductor 这类编排工具我还没实际用过。Claude Code 的 agent teams 是实验功能，`claude agents` 是 research preview，行为和命令都可能变。

网络和账号那两层（出口 IP、DNS、账号安全）的问题仍然存在，见《AI 开发者生态的五层》，那篇保留为 2026 年年中的快照。

## 参考资料

- [Claude Code：并行运行 Agent 的几种方式](https://code.claude.com/docs/en/agents)
- [Claude Code：用 worktree 运行并行会话](https://code.claude.com/docs/en/worktrees)
- [Introducing the Codex app（OpenAI）](https://openai.com/index/introducing-the-codex-app/)
- [Orca](https://www.onorca.dev/)
- [The Code Agent Orchestra（Addy Osmani）](https://addyosmani.com/blog/code-agent-orchestra/)
