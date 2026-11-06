---
title: When agents multiply, they have to talk to each other
description: From one agent tending a blog to thousands spread across cloud, laptops, and the edge. Personal assistants and in-system agents are two different shapes, the US and China are at different stages with the first, and however agents are deployed, they need to reach each other. The hard part is trust.
date: 2026-11-06
topic: ai
tags:
  - agent
status: versioned
draft: false
---

> Products and protocols checked on 2026-11-06. This is more opinion than tutorial: the trends are my reading, and the facts have sources.

This blog is currently run with the help of one agent. It reads the `AGENTS.md` in the repository, edits posts and the site by those rules, runs the build, and I read the diff and decide whether to commit. One person, one agent, one repository. The relationship is simple.

That stage won't last long. When I write code I already keep two or three sessions open, one on a feature and one on a bug. Further out, tens, hundreds, even thousands of agents running at once is not an exaggeration. Some will be in the cloud, some on my laptop, some on an edge server somewhere. They may be scheduled by a central coordinator, or work peer to peer with no one in charge.

However they are deployed and organized, one thing can't be avoided: they have to be able to reach each other.

## Two shapes: assistants that act for a person, and swarms inside a system

As agents multiply, I think they split into two shapes.

The first is the **personal assistant**. It serves one person and acts for them: booking a restaurant, sorting email, comparing prices and placing an order. The user can see it and talk to it. It represents you.

The second is **agents inside a system**. A system runs many agents internally to do its own work: a large code migration split across dozens of subagents, or a customer-service flow with one agent checking orders, one handling refunds, one reviewing. Users never see them. They represent the system.

The two run into different problems. For assistants, the problem is getting hold of your identity and authorization. For in-system agents, it is division of labor and coordination. But the two will meet: when your assistant goes to get something done, whoever receives it on the other side may well be an agent inside someone else's system.

## Shape one: personal assistants, and where the computer lives

An assistant that works for you over time needs a computer that is always on. Where that computer lives is the biggest split in this generation of products.

Put it on your own machine, and the agent can reach what's there: files, browsers you're already logged into, your apps. Convenient, but it is tangled up with your personal environment and can touch more than you'd like. People who want control keep a Mac mini at home running open-source OpenClaw or Hermes Agent, but ordinary users won't maintain an always-on computer just for an assistant.

Put it in the cloud, and the provider gives you a virtual machine. Close the app and it keeps working on that machine. Each service you want it to use gets its own login and authorization on that machine, so the boundary is clearer. The cost moves elsewhere: every account you log into there, the provider now holds the credentials, and cloud machines use data-center IPs, which websites are wary of by default.

The US and China have taken different paths here, and they are about one stage apart.

## The US: every major lab has shipped a cloud assistant, in the early paid stage

This year several large US companies shipped personal agents almost at once, and they converged on the same design: the computer lives in the cloud.

- Google announced [Gemini Spark](https://techcrunch.com/2026/05/19/google-introduces-gemini-spark-a-24-7-agentic-assistant-with-gmail-integration/) at I/O in May. It runs in Google's cloud, has its own Gmail address, uses Chrome for web tasks, and is in testing for high-tier US subscribers only.
- xAI released [Grok Bot](https://x.ai/bot) in beta in August. Bots work on a cloud computer with a browser, file system, and terminal (the docs say all Bots under one account share that computer).
- Meta launched [Muse](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/) on September 8. It has a free tier and works inside WhatsApp, which makes it the closest of these to ordinary users.
- OpenAI announced [Dots](https://thenextweb.com/news/openai-dots-always-on-ai-agents-cloud-computers-devday) at DevDay at the end of September. Each agent again gets its own cloud computer and connects to thousands of apps, starting with Pro and premium business tiers.

Apple is the exception. The [new Siri](https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/) announced in June takes the local route: it reads the messages, email, and photos on your phone, understands what's on screen, and acts across apps, handing off to Apple's own private cloud when it needs more compute.

All of them are doing the same thing: turning "what it can do alone and what it must ask about" into a product feature. Dots lets users write their own rules for which actions are allowed, blocked, or need confirmation. When nobody is around, it can only research with read-only tools; it can't send messages or drive a browser.

So the US stage looks like this: products have shipped, the design has largely converged on "cloud computer plus authorization rules", but most are still in testing or high-priced tiers, some distance from everyday use. Resistance has started too: two weeks after Muse launched, [Amazon blocked it from its store](https://en.wikipedia.org/wiki/Muse_(AI_agent)). Platform gatekeeping is a US problem as well.

## China: running inside one ecosystem first, cross-platform still blocked

The Chinese internet is far more closed. Many services offer full functionality only in their own app, logins are tied to SMS codes on a phone number, sensitive actions require face recognition, and companies rarely open interfaces to each other. An agent on a cloud VM that logs into websites on your behalf barely works there. So Chinese personal agents have taken other routes.

The first is the platform building its own, working inside its own ecosystem. In January, Alibaba's Qwen app [connected to Taobao, Alipay, Fliggy, and Amap](https://finance.sina.com.cn/jjxw/2026-01-15/doc-inhhiyxz3472379.shtml) (in Chinese): you can order food, book flights, and pay with Alipay inside the chat, after authorizing each app account the first time. It calls Alibaba's own business interfaces rather than simulating taps on a screen. In October it began a small closed beta of "Qwen Go!", a further step toward a personal agent. This is the furthest any Chinese product has gone, but it goes that far because the services are all Alibaba's.

The second is living on the phone and operating apps with system-level permissions. ByteDance's Doubao phone assistant, released last December, is the example. Technically it worked, but within days it hit a wall: WeChat flagged "abnormal login environment" and forced accounts offline, Taobao triggered risk controls, and in [a test by Beijing News, 8 of 23 apps could not be used](https://m.bjnews.com.cn/detail/1765335074129085.html) (in Chinese). ByteDance has spent this year in talks with phone makers such as Honor and vivo, but as of the reports I found, nothing has been formally launched. What stopped it was not model capability. It was platforms refusing to let it in.

The third is wiring a local agent into a chat app. Tencent started a closed beta of QClaw in March: the agent runs on your own computer and you control it by messaging it in WeChat. The same month WeChat added a [ClawBot plugin](https://www.ithome.com/0/931/431.htm) (in Chinese) that calls OpenClaw directly from the chat window. The computer stays local and the entry point is WeChat, which sidesteps the problem of logging in on your behalf from the cloud.

Regulation got there early too. In May, the Cyberspace Administration of China, the National Development and Reform Commission, and the Ministry of Industry and Information Technology jointly issued [implementation guidelines on agents](https://sf.sz.gov.cn/ztzl/hg/yjxx/zdhy/xxcs/content/post_12860204.html) (in Chinese). They require decisions to be split into three kinds: those only the user can make, those that need the user's authorization, and those the agent may make on its own. That is the same idea as Dots' authorization rules. The US gets there through product design; China draws the line through regulation first.

So the China stage looks like this: the user base is huge, with AI apps such as Doubao and Qwen counting monthly users in the hundreds of millions, but there is no personal agent yet that can genuinely act across platforms for you. Progress is fastest inside a single ecosystem, and the road between ecosystems is blocked by the platforms.

## Where the two differ

| | US | China |
| --- | --- | --- |
| Representative products | Muse, Dots, Gemini Spark, Grok Bot; Apple's new Siri | Qwen (Alibaba ecosystem), Doubao phone assistant, QClaw + WeChat |
| Where the computer lives | Mostly cloud VMs; Apple goes local | Platform interfaces, the phone OS, your own computer; rarely the cloud |
| How it crosses platforms | Open APIs, OAuth, plugins, plus a cloud browser | Mostly within one ecosystem; cross-platform attempts get stopped by risk controls |
| How authorization is set | Rules inside the product, customizable by the user | Regulation defines three kinds of decision; each platform binds its own authorization |
| Stage | Shipped, in testing and early paid tiers | Usable inside ecosystems; personal agents in closed beta |

My original view was that "China doesn't have a mature personal agent yet". After the research, that mostly holds, with one addition: the US isn't mature either, it is just one stage ahead, with products shipped and the design converged. China's gap is not in models but in the ecosystem: identity is tied to phones and faces, and services are locked inside each company's app. So Chinese personal agents are more likely to grow inside the phone OS and the super-apps than on a cloud VM.

## Shape two: swarms of agents inside a system

The easiest place for developers to see in-system multi-agent work today is coding tools. Claude Code's `/batch` splits a large change across 5 to 30 subagents, each editing in its own worktree, then gathers the results. Agent teams let one lead session run several members with a shared task list. These agents all belong to one system and answer to one coordinator.

Zoom out and enterprise systems are doing the same. In approval, support, and operations flows, when one agent isn't enough, the work is split across several, each owning a stage. Crossing system boundaries changes the problem: my agent has to deal with another company's agent, and neither answers to the other.

## However they're deployed, they need to reach each other

I group the connections between agents into three kinds.

**Agent to tool.** Agents call databases and APIs and read web pages. This layer has largely converged on MCP: a tool integrates once, and every agent can use it.

**Agent to agent.** Two agents hand off tasks and exchange results. Inside one system, a coordinator handing out work and collecting results is enough. Across systems you need a shared protocol, and Google's [A2A](https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year) is currently the main one: each agent publishes a card describing what it can do, and other agents use it to find the agent and assign it work.

**Agent to human.** Stopping before a consequential action to wait for a person's confirmation. That line won't disappear no matter how many agents there are.

Notably, these standards are consolidating. The Linux Foundation formed the [Agentic AI Foundation](https://github.com/aaif) last December with MCP, AGENTS.md, and goose as its first projects, and A2A joined in August this year. How tools connect, how rules are written, and how agents talk to each other are starting to share a common foundation.

As for centralized versus decentralized, I think both will coexist for a long time. Inside one system, central coordination is the least effort: clear division of labor, and when something breaks you know whom to ask. Across organizations there is no natural center, so peers connect through protocols. It's like service architecture today: companies govern their own services internally and talk to each other over HTTP.

## Once they can talk, the hard part is trust

Being able to connect is only the first step. The real question is how much to trust what another agent tells you.

Claude Code's cross-session messaging offers a small but clear answer. I can open several sessions on one machine and they can message each other, for example one session finishing a database migration and telling another it can continue. But the docs specify that a message from another session never counts as the user's consent: it can't approve a permission request on your behalf, can't get the receiver to change its configuration or `CLAUDE.md`, and any commands in it are not executed. If acting on the message needs a permission, the prompt still goes to you.

That rule still holds at the scale of thousands of agents: what passes between agents is information, not authorization. My agent can treat what another agent says as input, but it can't pay, delete data, or change settings for me because the other agent said so. Authorization can only come from a person, or from a scope a person has explicitly set in advance.

Identity is the other side of the same problem. When an agent shows up, whom does it represent? Was it sent by the user, or is someone impersonating them? A personal assistant needs a credential that says "acting for me", and systems need to be able to verify it. The US can borrow existing mechanisms like OAuth. China is stuck exactly here: identity is tied to phones and faces, and there is no form of authorization yet that can be handed to an agent and revoked at any time.

## What this means for developers

As agents go from one to many, developers have a few more things to think about.

For your own product, decide what happens when an agent comes calling. Give it a proper entry point (an API, an MCP server, an A2A capability card), or do what many apps do today and block anything that looks automated. Blocking is the least effort, but as more users get things done through their own assistants, blocking indefinitely also shuts those users out.

For any entry point you give agents, authorization should be fine-grained and revocable. Which actions an agent may take directly and which need the person's own confirmation should be decided at design time, not patched after something goes wrong.

When you use multiple agents inside your own system, start with central coordination. Bring in protocols when you genuinely need to collaborate across teams or systems.

I'm still at the first stage myself: one agent for the blog, two or three sessions when coding. How multi-agent work lands in programming today is in [From one agent to a group of agents](/en/blog/ai-tools/multi-agent-development/). The larger-scale part of this post is a judgment about direction, and I'll come back and revise it once I'm actually using it.

## References

- [Introducing Muse (Meta)](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)
- [Muse (AI agent) (Wikipedia)](https://en.wikipedia.org/wiki/Muse_(AI_agent))
- [Grok Bot (xAI)](https://x.ai/bot)
- [Google introduces Gemini Spark (TechCrunch)](https://techcrunch.com/2026/05/19/google-introduces-gemini-spark-a-24-7-agentic-assistant-with-gmail-integration/)
- [OpenAI launches dots (TNW)](https://thenextweb.com/news/openai-dots-always-on-ai-agents-cloud-computers-devday)
- [Apple introduces Siri AI (Apple)](https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/)
- [Qwen app connects to Taobao, Alipay, Fliggy and other Alibaba services (Sina Finance, in Chinese)](https://finance.sina.com.cn/jjxw/2026-01-15/doc-inhhiyxz3472379.shtml)
- [Tencent releases the WeChat ClawBot plugin (IT Home, in Chinese)](https://www.ithome.com/0/931/431.htm)
- [Doubao turns to Honor (21st Century Business Herald, in Chinese)](https://www.21jingji.com/article/20260414/herald/ae00b40b7b15d73261cf3bb7cea6c70b.html)
- [Implementation guidelines on the regulated use and development of agents (reposted by the Shenzhen Justice Bureau, in Chinese)](https://sf.sz.gov.cn/ztzl/hg/yjxx/zdhy/xxcs/content/post_12860204.html)
- [8 of 23 apps unusable: testing the Doubao phone (Beijing News, in Chinese)](https://m.bjnews.com.cn/detail/1765335074129085.html)
- [Doubao phone assistant restricted by WeChat (21st Century Business Herald, in Chinese)](https://www.21jingji.com/article/20251203/herald/c5bd5b6275684669e493723dc4c54e94.html)
- [Linux Foundation announces the Agentic AI Foundation (PR Newswire)](https://www.prnewswire.com/news-releases/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation-aaif-anchored-by-new-project-contributions-including-model-context-protocol-mcp-goose-and-agentsmd-302636897.html)
- [A2A Protocol Surpasses 150 Organizations (Linux Foundation)](https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year)
- [Agentic AI Foundation (GitHub)](https://github.com/aaif)
- [Claude Code: cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging)
- [Claude Code: ways to run agents in parallel](https://code.claude.com/docs/en/agents)
