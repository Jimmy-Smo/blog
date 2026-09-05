---
title: AI 开发者生态的五层
description: 从模型、工具、编排往下看到网络和账号：上面三层决定能做什么，下面两层决定能不能稳定用。
date: 2026-07-20
updated: 2026-09-05
tags:
  - ai-tools
  - developer-ecosystem
  - agent
  - network
status: versioned
draft: false
---

> 工具名单、接口和订阅档位变化很快。文中产品描述与调查数字最近核验于 2026-09-05，使用前对照官方文档。

网页能打开 ChatGPT，终端里的 CLI 却连不上；换个出口能注册，过两天又开始人机验证。这类情况很容易被当成模型或工具坏了。更常见的原因在下面：出口 IP 质量、DNS 是否泄露、账号是不是干净。

把生态压成这五层之后，模型换了、CLI 换了，只是上面某一格变了；风控、封号、连不上，多半还是下面两格的事。

## 先说结论

Chat、CLI、Agent 的核心差别是**执行权在谁手里**。CLI 已经进入日常开发，Agent 仍处早期采用阶段。

采用面已经很大，信任没有跟上。工具好不好用，取决于上下文、权限、验证，以及人自己的判断。

## 从 Chat 到 Agent：执行权在谁手里

| 形态 | 交互方式 | 典型代表 | 当前位置 |
| --- | --- | --- | --- |
| Web Chat | 人提问，AI 输出文本或其他内容，人负责后续执行 | ChatGPT 网页版、Claude.ai | 成熟的通用入口 |
| CLI 工具 | AI 按需读取项目文件、修改代码并运行命令 | Claude Code、Codex、Grok Build、Pi | 逐渐进入日常开发流程 |
| Agent | 给定目标后，AI 规划步骤、调用工具并根据结果迭代 | Hermes Agent、DeepSeek Harness、各类 Agent 框架 | 仍在早期采用阶段 |

CLI 和 Agent 能进开发流程，主要是三件事叠在一起。网页 Chat 经常要手动粘贴文件和错误信息，CLI 可以在授权范围内按需读仓库；它们还能直接跑命令、测试和检查工具，少一层复制粘贴，结果仍要人审；CLI 能进脚本、进 CI、被其他程序调用，网页 Chat 是交互终点，不好组合。

三种形态都值得了解。优先练的是：给足上下文、收紧权限，并用测试或其他可观察结果验证输出。具体怎么把 Claude Code 接进工作流，我另写过 [AI 编程工具选型与工作流](https://jimmy42x.com/blog/ai-tools/ai-coding-workflow/)。

## 五层：上面是生产力，下面是可用性

| 层级 | 职责 | 代表 |
| --- | --- | --- |
| 模型层 | 提供智能能力（API / 订阅） | OpenAI / Anthropic (Claude) / xAI (Grok) / DeepSeek / Kimi / GLM |
| 工具层 | 把模型接入本地开发环境 | Claude Code / Codex / Grok Build / Pi / DeepSeek Harness / OpenCode |
| 编排层 | 统一管理多工具、多模型配置 | CC Switch |
| 网络基础设施层 | 保证对境外服务的稳定、高质量访问 | 代理客户端 / 节点 / IP 质量 / DNS |
| 账号入口层 | 服务的身份基础 | Google 账号 / GitHub 账号 / 各 AI 平台账号 |

自上而下是生产力路径：选模型 → 选工具 → 管理配置。显性、讨论也多。自下而上是可用性路径：账号能注册、网络能稳定访问，是上面三层的前提。多数使用问题（风控、封号、限流、连接不稳）出在下面两层，而不是模型或 CLI 本身。

## 模型层：同一套 CLI 可以换后端

这些平台通常同时有面向普通用户的产品或会员，以及面向开发者的 API。学工具链时，主要会碰到 API Key、用量页面、模型列表和速率限制。ChatGPT 订阅（对话）与 API 平台（开发、按 token 计费）是两套独立的账号计费体系，别的家也常有类似拆分。

| 平台 | 定位 | 入口 |
| --- | --- | --- |
| OpenAI | 生态最大 | [platform.openai.com](https://platform.openai.com)、[Codex 入门](https://chatgpt.com/codex/get-started/) |
| Anthropic / Claude | 长上下文和代码能力突出；Claude Code 是官方终端 Agent，订阅（Pro/Max）与 API 都可作后端 | [docs.anthropic.com](https://docs.anthropic.com) |
| xAI / Grok | Grok 模型，以及终端 / TUI 编程工具 Grok Build，可读写仓库、跑命令，并兼容常见的 `AGENTS.md` / `CLAUDE.md`、skills、hooks | [x.ai](https://x.ai/)、[Grok Build 文档](https://x.ai/docs/build/overview) |
| DeepSeek | 国内可直连，API 价格显著低于海外平台，适合高频调用、批处理。另有官方 harness（dsh），见工具层 | [platform.deepseek.com](https://platform.deepseek.com/usage) |
| Kimi（月之暗面） | Kimi K2 系列开放权重，主打长上下文与 Agent / 代码；API 提供 Anthropic 兼容接口，常被当作 Claude Code 等 CLI 的低成本替换后端 | [platform.kimi.com](https://platform.kimi.com)（国内）、[platform.kimi.ai](https://platform.kimi.ai)（国际） |
| GLM（智谱 AI） | GLM-4.x 系列同样开放权重；GLM Coding Plan 以包月方式提供 Claude Code 兼容接入，是国内「低成本跑 CLI」的常见路线 | [open.bigmodel.cn](https://open.bigmodel.cn)（国内）、[z.ai](https://z.ai)（国际） |

DeepSeek、Kimi、GLM 的共同意义，是让工具层与模型层解耦变得实用：同一个 Claude Code 或 OpenCode，可以按任务成本在多家后端之间切换。这是后文 CC Switch 这类编排工具存在的前提。DeepSeek 后来把 harness 也开源了，解耦还可以发生在驾驭层：不必只把 Claude Code 接到便宜后端，可以直接换运行时。Kimi / GLM 的 Anthropic 兼容接入我还没实测，配置方式和稳定性以各家文档为准。

Google 在这篇里不当作模型供应商展开，只作为账号、浏览器与搜索基础设施，放到账号层。

## 工具层正在分叉：厂商产品和开源 harness

工具层有两条路。厂商产品把模型和驾驭层绑在一起卖。开源 harness 把模型当插件，核心做多厚、哪些能力留给你装，各家不一样。

厂商产品选哪个，主要看你订阅了哪家模型。开源 harness 选哪个，看你要的是最小核心（Pi）、插件内核（dsh），还是一个现成能跑的多后端客户端（OpenCode / Hermes）。

| 工具 | 类型 | 定位 |
| --- | --- | --- |
| [Claude Code](https://code.claude.com/docs/en/overview)（Anthropic 官方） | 厂商产品 | 以终端 CLI 为主要入口，也支持 IDE、桌面端和网页端。可读写代码库、执行命令，并通过 Git、MCP、Skills、Hooks 接入开发流程 |
| [Codex](https://chatgpt.com/codex/get-started/)（OpenAI） | 厂商产品 | 代码生成与执行环境，本地 CLI 与云端任务两种形态 |
| [Grok Build](https://x.ai/docs/build/overview)（xAI 官方） | 厂商产品 | 终端 / TUI 侧 Agent 编程工具，可读写仓库、跑命令，与 `AGENTS.md` / skills / hooks 等配置配合使用 |
| [Pi](https://pi.dev)（Earendil Works，开源） | 开源 harness | 最小核心的终端 harness。默认四个工具（read / write / edit / bash），用 TypeScript 扩展、skills、packages 自己加能力；接 15+ 家供应商，会话中途可切换。官方不内置权限弹窗，默认以启动它的用户权限运行 |
| [DeepSeek Harness](https://www.deepseek.com/harness/en/)（`dsh`，DeepSeek 官方，开源） | 开源 harness | 口号是 everything is a plugin：模型、工具、skills、会话、沙箱、调度和 UI 都是插件。默认入口是本地 Web UI（`npx @deepseek-ai/dsh web`）。目前是开发者预览，官方写明会有破坏兼容性的变更 |
| [OpenCode](https://opencode.ai) | 开源 harness | 开源社区的终端 AI 编程工具，可接多家模型后端，适合想降低单一供应商绑定的场景 |
| [Hermes Agent](https://github.com/nousresearch/hermes-agent)（Nous Research，开源） | 开源 harness | 仓库已经很大，更适合先当成品用，不适合当源码入门材料 |

Pi 和 dsh 把 harness 本身做成了产品，和仓库里的 `AGENTS.md`、skills、hooks 不是同一层：前者是你装哪个运行时，后者是你给运行时什么规矩。仓库里那套配置这篇不展开。

MCP（Model Context Protocol）是 Anthropic 发起的开放协议，用统一接口把外部工具和数据源（数据库、浏览器、内部 API 等）接到 AI 工具上。Claude Code、Codex、Grok Build 等厂商 CLI 均支持或兼容同类扩展方式。它之于 AI 工具，类似 LSP 之于编辑器：工具方接入一次，兼容客户端都能调用。Pi 默认不内置 MCP，官方建议用 skills 或自己写扩展，这是最小核心的一部分。评估 CLI 生态，既要看 MCP 与插件，也要看它把哪些能力留在核心、哪些留给你装。

网页本身还不是模型能直接吃的输入。[Firecrawl](https://www.firecrawl.dev/) 把任意网页抓成干净的 Markdown 或 JSON，典型场景是给 RAG（检索增强生成）准备语料、让 Agent 读一个网站而不被 HTML 噪音淹没、批量采集文档站做知识库。在工具链里：Agent 是手，Firecrawl 是眼，负责把网页变成模型可读输入。

## 编排层：配置散了才需要 CC Switch

[CC Switch](https://ccswitch.io/)（[中文](https://ccswitch.io/zh/)）是跨平台桌面工具，统一管理多个 AI 编程工具的配置（API Key、模型选择、供应商切换）。截至 2026-09-05，官网列出的是 Claude Code、Claude Desktop、Codex、Gemini CLI、OpenCode、OpenClaw 和 Hermes Agent（以官网当前列表为准；Grok Build、Pi、DeepSeek Harness 等可用其自身配置或兼容层管理）。

同时用两三个 CLI、接两三家模型时，配置散在各自文件里，切供应商要逐个改。CC Switch 给统一入口，降低切换成本。工具层已经多到需要「管理工具的工具」，类似当年 nvm 之于 Node 版本。只用一家、只装一个 CLI，不必上这一层。

## 网络层：能打开网页不等于能稳定用

原则就一句：**节点质量大于是否能连通**。

境外 AI 服务普遍对来源 IP 做画像评分。住宅 IP（家庭宽带）信誉最高；机房 IP（数据中心）是代理、爬虫的典型特征，信誉天然偏低。一个 IP 背后挂的用户越多，行为越杂，越容易被标成滥用来源。IP 若曾被用于批量注册、爬虫、垃圾邮件，会进入各类黑名单。低质量 IP 之后是风控，再往后是注册被拒、频繁人机验证、账号封禁或服务降级。能打开网页，不等于能稳定使用。

同一节点的 IPv4 和 IPv6 路由可能完全不同，实测延迟可能差数倍，部分服务对 IPv6 支持不完整。台湾、日本、美国等不同出口，延迟、丢包与目标服务的风控策略都不同，物理距离近不等于路由优。DNS 解析结果决定连到哪个机房；解析请求如果走了本地运营商，还会造成环境不一致，本身就是风控信号。

换节点后，习惯是先跑一遍检测（IP 类型、风险分、DNS 出口、WebRTC 是否泄露），再登录重要账号。

| 工具 | 用途 |
| --- | --- |
| [ipdata.co](https://ipdata.co/) | IP 归属、类型、威胁情报评分 |
| [ip.net.coffee/ip](https://ip.net.coffee/ip/) | 综合 IP 属性检测 |
| [ip.net.coffee/gpt](https://ip.net.coffee/gpt/) | 针对 ChatGPT 的 IP 环境检测（住宅 / 机房 / 风险 / DNS） |
| [Claude Code 稳定性说明](https://ip.net.coffee/claude/claudecode.html) | 使用环境与配置优化说明 |

客户端只是壳，体验取决于订阅节点质量。具体机场和节点渠道不列名单，自己检索即可，名单也不构成推荐。

## 账号层：Google 和 GitHub 是根

[Google 账号](https://accounts.google.com/) 是国际服务的基础入口：ChatGPT、Claude、Grok 乃至大多数开发者服务都支持 Google OAuth 登录。一个信誉良好的 Google 账号是整个体系的根。Chrome 是日常浏览、扩展和登录态的基础环境，Google Search 则是定位官方文档、源码与一手资料的入口之一，再交给 CLI 或 Agent 深挖。

ChatGPT（OpenAI）、Claude（Anthropic）、Grok（xAI）各自独立注册，均对注册和使用时的网络环境敏感。GitHub 在代码托管之外，也是大量开发者工具的 OAuth 身份源。

账号多了以后，密码复用是最大的单点风险。[1Password](https://1password.com/) 这类密码管理器的用处，是为每个服务生成唯一强密码。Google、GitHub 等根账号务必开启两步验证（2FA），优先用 TOTP 或硬件密钥而非短信。备用邮箱和恢复码离线保存：根账号一旦丢失，挂在上面的 OAuth 登录会连锁失效。买现成账号、外区 ID 这类渠道不写，自己注册、自己管密码。

## 采用面已经很大，信任还没有跟上

截至 2026-07，最近一轮大型开发者调查大致指向三件事。

[Stack Overflow 2025 开发者调查](https://survey.stackoverflow.co/2025/ai) 里，84% 的受访者正在使用或计划使用 AI 工具；[DORA 2025 报告](https://dora.dev/research/2025/dora-report/) 里，约 90% 的受访者表示已在工作中使用 AI。采用面已经铺开。

效率提升和信任不足同时存在。Stack Overflow 调查中，52% 的开发者认为 AI 工具或 Agent 提高了效率，但不信任输出准确性的人比信任的人更多（46% 对 33%）。最大的单项抱怨是「AI 给出的方案几乎对，但没完全对」（66%），紧随其后的是调试 AI 生成的代码更耗时（45%）。

Agent 还没有成为主流工作方式。Stack Overflow 调查中，52% 的开发者没有使用 Agent，或仍只用较简单的 AI 工具，38% 明确不打算采用。DORA 把 AI 归纳为组织能力的放大器：工程流程健全时更容易取得收益，原有的流程问题也会被一起放大。

调查数据和分层模型落到同一件事上：工具已经普及，但输出仍要人审；下面两层配不好，上面三层再强也用不稳。我自己的顺序是先把网络和账号配稳，再把一个 CLI 当日常环境用起来，而不是同时追好几套。体系化资料（比如 [JavaGuide](https://javaguide.cn/)）仍然重要，信息获取的主入口仍是 Google 和 GitHub。AI 能替你写代码，审核输出需要判断力。

## 本文没有覆盖的

指令文件、skills、hooks、权限和验收怎么写成一套 harness，这篇只点到为止，不写操作步骤。

Hermes Agent、Pi、DeepSeek Harness 都还没实际跑过。DeepSeek Harness 目前是开发者预览，插件契约会变，不能当稳定日用工具写。Kimi / GLM 的 Anthropic 兼容接入（配置方式、稳定性、与 CC Switch 的配合）也还没实测。ping0.cc 在 2026-07-20 那次核验里打不开，检测工具表里暂时没放。

浏览器扩展和用户脚本是个人环境，不展开。具体机场、节点渠道和买号平台不列名单，自己检索即可。

## 参考

- [Claude Code Overview](https://code.claude.com/docs/en/overview)（核验日期 2026-07-20）
- [Anthropic 文档中心](https://docs.anthropic.com)
- [OpenAI 开发者平台](https://platform.openai.com)
- [xAI](https://x.ai/)
- [Grok Build](https://x.ai/docs/build/overview)
- [Pi](https://pi.dev)（文档：[pi.dev/docs/latest](https://pi.dev/docs/latest)；仓库：[earendil-works/pi](https://github.com/earendil-works/pi)）
- [DeepSeek Harness](https://www.deepseek.com/harness/en/)（仓库：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)；核验日期 2026-09-05）
- [OpenCode](https://opencode.ai)
- [Firecrawl](https://www.firecrawl.dev/)
- [CC Switch](https://ccswitch.io/)
- [Stack Overflow 2025 Developer Survey · AI](https://survey.stackoverflow.co/2025/ai)（数字核验日期 2026-09-05）
- [DORA 2025: State of AI-assisted Software Development](https://dora.dev/research/2025/dora-report/)
- [AI 编程工具选型与工作流](https://jimmy42x.com/blog/ai-tools/ai-coding-workflow/)
