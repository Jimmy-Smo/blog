---
title: Agent 多起来以后，它们得互相说话
description: 从一个 Agent 管一个博客，到成百上千个 Agent 分散在云端、电脑和边缘：个人助手和系统内部是两种形态，中美的个人助手走到了不同阶段；不管怎么部署，它们之间都要联系，难的是联系之后的信任。
date: 2026-11-06
topic: ai
tags:
  - agent
status: versioned
draft: false
---

> 产品和协议的情况核验于 2026-11-06。这是一篇判断多于教程的文章，里面的趋势是我的看法，事实部分附了来源。

这个博客现在就是由一个 Agent 帮我打理的。它读仓库里的 `AGENTS.md`，按里面的规矩改稿、改界面、跑构建，我看 diff，决定提不提交。一个人，一个 Agent，一个仓库，关系很简单。

但这个阶段不会停太久。写代码时我已经会同时开两三个会话，一个做需求，一个修 bug。再往后，几十个、几百个，甚至成千上万个 Agent 同时在跑，并不是夸张的说法。它们有的在云端，有的在我的电脑上，有的在某台边缘服务器上；可能由一个中心统一调度，也可能各自为政、点对点协作。

不管怎么部署、怎么组织，有一件事绕不开：它们之间得能联系上。

## 两种形态：替人办事的助手，和系统里的一群 Agent

Agent 多起来以后，我觉得会分成两种形态。

第一种是**个人助手**。它面向一个人，替这个人办事：订餐厅、整理邮件、比价下单。用户能看见它，跟它对话，它代表的是你。

第二种是**系统内部的 Agent**。一个系统为了完成自己的工作，在内部跑很多 Agent：一个大的代码迁移拆给几十个子代理分头改，一条客服流程里有负责查订单的、负责退款的、负责审核的。用户看不见它们，它们代表的是这个系统。

这两种形态遇到的问题不一样。助手的问题是怎么拿到你的身份和授权，系统内部的问题是怎么分工和协调。但两者会碰到一起：你的助手要去办一件事，接待它的很可能是对方系统里的某个 Agent。

## 形态一：个人助手，电脑放在哪

个人助手要替你长期办事，就得有一台一直开着的电脑。这台电脑放在哪，是这一代产品最大的分歧。

放在本地，Agent 能直接拿到你电脑上的东西：文件、已经登录的浏览器、各种应用。方便，但它和你的个人环境缠在一起，能碰到的比你想让它碰的多。想自己掌控的人会在家里放一台 Mac mini，跑开源的 OpenClaw 或 Hermes Agent，但普通人不会为一个助手专门维护一台常开的电脑。

放在云端，服务商给你一台虚拟机，你关掉 App，它还在那台机器上替你干活。要用哪个服务，就在那台机器上单独登录、单独授权，边界更清楚。代价是换了地方：你登录的每个账号，凭据都交给了服务商保管；云端机器用的是机房 IP，网站对这类来源天然戒备。

中美两边在这个问题上走出了不同的路，进展也差了一个阶段。

## 美国：大厂都发了云端助手，处在付费早期

今年美国几家大厂几乎同时把个人 Agent 推了出来，而且路线高度一致：电脑放在云端。

- Google 在 5 月的 I/O 上发布 [Gemini Spark](https://techcrunch.com/2026/05/19/google-introduces-gemini-spark-a-24-7-agentic-assistant-with-gmail-integration/)，跑在 Google 的云上，有自己的 Gmail 地址，用 Chrome 办网页上的事，目前只对美国的高价订阅用户开放测试。
- xAI 在 8 月放出 [Grok Bot](https://x.ai/bot) 测试版，Bot 在一台带浏览器、文件系统和终端的云端电脑上干活（文档写明同一账号下的多个 Bot 共用这台电脑）。
- Meta 在 9 月 8 日推出 [Muse](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)，有免费档，能在 WhatsApp 里用，是这几家里离普通人最近的一个。
- OpenAI 在 9 月底的 DevDay 上发布 [Dots](https://thenextweb.com/news/openai-dots-always-on-ai-agents-cloud-computers-devday)，同样是每个 Agent 一台云端电脑，接入几千个应用，先开放给 Pro 和企业高价档。

Apple 是个例外。6 月发布的 [新 Siri](https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/) 走的是本地路线：读你手机里的消息、邮件、照片，看懂屏幕，在 App 之间替你操作，需要算力时再交给 Apple 自己的私有云。

这几家都在做同一件事：把「什么能自己做、什么要问人」变成产品功能。Dots 让用户自己写规则，指定哪些操作允许、禁止或必须确认；没人在旁边时，它只能用只读工具做调研，不能发消息、不能操作浏览器。

所以美国的阶段是：产品已经发布，玩法基本收敛到「云端电脑 + 授权规则」，但大多还在测试或高价订阅档，离普通人日常在用还有一段距离。阻力也开始出现：Muse 上线两周，[Amazon 就把它挡在了商店外面](https://en.wikipedia.org/wiki/Muse_(AI_agent))。平台把关的问题，美国也有。

## 中国：在一个生态里先跑起来，跨平台还走不通

国内的互联网封闭得多。很多服务只在自家 App 里提供完整功能，登录绑手机验证码，敏感操作要人脸识别，各家之间很少开放接口。一个跑在云端虚拟机上、替你登录各个网站的 Agent，在国内几乎走不通。所以国内的个人 Agent 走了另外几条路。

第一条是平台自己做，在自家生态里办事。阿里的千问 1 月 [接入了淘宝、支付宝、飞猪、高德](https://finance.sina.com.cn/jjxw/2026-01-15/doc-inhhiyxz3472379.shtml)，可以在对话里点外卖、订机票、用支付宝付款，第一次使用时授权绑定各个 App 的账号。它调用的是自家业务的接口，不是去模拟点屏幕。10 月又开始小范围内测「千问 Go!」，往个人 Agent 的方向再走一步。这是国内目前走得最远的，但走得远的前提是这些服务都是阿里自己的。

第二条是装在手机里，以系统权限替你操作各个 App。去年 12 月的豆包手机助手是代表。技术上能做到，结果上线几天就碰了壁：微信提示登录环境异常、强制下线账号，淘宝触发风控，[新京报实测的 23 款 App 里有 8 款用不了](https://m.bjnews.com.cn/detail/1765335074129085.html)。今年字节一直在和荣耀、vivo 等手机厂商谈合作，但截至我查到的报道，还没有正式落地。卡住它的不是模型能力，而是平台不放行。

第三条是把本地的 Agent 接进聊天软件。腾讯 3 月开始内测 QClaw，Agent 跑在你自己的电脑上，你在微信里发消息遥控它；微信同月还出了 [ClawBot 插件](https://www.ithome.com/0/931/431.htm)，在聊天界面里直接调用 OpenClaw。电脑放在本地，入口放在微信，绕开了「云端替你登录」这个难题。

监管也走在了前面。5 月，网信办、发改委、工信部联合印发 [《智能体规范应用与创新发展实施意见》](https://sf.sz.gov.cn/ztzl/hg/yjxx/zdhy/xxcs/content/post_12860204.html)，要求把决策分成三类：只能由用户本人决定的、需要用户授权的、智能体可以自主决定的。这和 Dots 的授权规则说的是同一件事，美国靠产品设计，中国靠监管先划线。

所以中国的阶段是：用户规模很大，豆包、千问这类 AI 应用的月活已经以亿计，但能真正替你跨平台办事的个人 Agent 还没有。进展最快的在单一生态内部，跨生态的那条路被平台挡着。

## 两边差在哪

| | 美国 | 中国 |
| --- | --- | --- |
| 代表产品 | Muse、Dots、Gemini Spark、Grok Bot；Apple 新 Siri | 千问（阿里生态）、豆包手机助手、QClaw + 微信 |
| 电脑放在哪 | 主流是云端虚拟机，Apple 走本地 | 平台接口、手机系统、自己的电脑，很少放云端 |
| 怎么跨平台 | 开放接口、OAuth、插件，加云端浏览器 | 主要在自家生态内；跨平台的尝试被风控拦下 |
| 授权怎么定 | 产品里的授权规则，用户自定义 | 监管划定三类决策，平台自己的授权绑定 |
| 所处阶段 | 已发布，测试和付费早期 | 生态内可用，个人 Agent 在内测 |

我原来的判断是「国内还没有成熟的个人 Agent」，查完资料，这个判断大体成立，但要补一句：美国其实也还没到成熟，只是早了一个阶段，产品都发了，路线也收敛了。国内的差距不在模型，在生态：身份绑在手机和人脸上，服务锁在各家 App 里。所以国内的个人 Agent 更可能长在手机系统和超级 App 里，而不是一台云端虚拟机上。

## 形态二：系统内部的一群 Agent

系统内部的多 Agent，开发者现在最容易看到的例子在编程工具里。Claude Code 的 `/batch` 会把一个大改动拆给 5 到 30 个子代理，每个在独立的 worktree 里改，最后汇总；agent teams 让一个主会话带着几个成员分工，有共享的任务列表。这些 Agent 都属于同一个系统，归一个调度者管。

把视野放大，企业系统也在这样做。审批、客服、运维流程里，一个 Agent 不够，就拆成几个各管一段。跨系统的时候，问题就变了：我的 Agent 要和另一家公司的 Agent 打交道，谁也不归谁管。

## 不管怎么部署，都要互相联系

Agent 之间的联系，我会分成三类。

**Agent 和工具。** Agent 要调数据库、调接口、读网页。这一层基本统一到了 MCP 上，工具方接一次，各家 Agent 都能用。

**Agent 和 Agent。** 两个 Agent 之间传递任务、交换结果。同一个系统里，调度者派活、收结果就够了。跨系统时需要一个公共的协议，Google 发起的 [A2A](https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year) 是目前最主要的一个：每个 Agent 公开一张描述自己能做什么的卡片，别的 Agent 据此找到它、给它派任务。

**Agent 和人。** 关键操作停下来等人确认，这条线不管 Agent 多少都不会消失。

值得注意的是，这些标准正在往一处收拢。Linux 基金会去年 12 月成立了 [Agentic AI Foundation](https://github.com/aaif)，首批项目是 MCP、AGENTS.md 和 goose；A2A 今年 8 月也并了进来。工具怎么接、规矩怎么写、Agent 之间怎么说话，开始有了共同的底座。

至于中心化还是去中心化，我觉得两种会长期并存。同一个系统内部，中心调度最省事，分工清楚，出了问题知道找谁。跨组织的时候没有天然的中心，只能靠协议点对点联系。就像今天的服务架构，公司内部有自己的服务治理，公司之间靠 HTTP 接口。

## 联系上之后，难的是信任

能联系上只是第一步。真正难的问题是：另一个 Agent 发来的话，我该信几分？

Claude Code 的跨会话消息给了一个很小但很清楚的答案。我在一台电脑上开几个会话，它们可以互相发消息，比如一个会话做完数据库迁移，通知另一个可以继续了。但文档规定，另一个会话发来的消息永远不算用户本人的同意：它不能替你批准权限请求，不能让接收方改配置或 `CLAUDE.md`，里面写的命令也不会被执行。接收方要做的事如果需要权限，弹出来的还是给你的确认框。

这条规矩放大到成千上万个 Agent 也成立：Agent 之间传的是信息，不是授权。我的 Agent 可以把对方 Agent 说的话当作参考，但不能因为对方说了，就替我付款、删数据、改设置。授权只能来自人，或者来自人事先明确划定的范围。

身份也是同一个问题的另一面。一个 Agent 找上门来，它代表谁？是用户本人派来的，还是谁伪装的？个人助手要拿到「代表我」的凭证，系统要能验证这份凭证。美国有 OAuth 这类现成的授权方式可以借用，国内恰恰卡在这一步：身份绑在手机和人脸上，还没有一个能交给 Agent、又能随时撤销的授权方式。

## 对开发者意味着什么

Agent 从一个变成一群，开发者要多想几件事。

自己的产品，要想清楚 Agent 来访时怎么办。是给它一个正式的入口（API、MCP 服务、A2A 的能力卡片），还是像今天很多 App 那样，检测到自动化操作就拦下来。拦是最省事的，但当用户越来越多地通过自己的助手来办事，一直拦下去，也就把这部分用户挡在了门外。

给 Agent 的入口，授权要能细分、能撤销。哪些操作 Agent 可以直接做，哪些必须本人确认，要在设计时就定下来，而不是出了事再补。

在自己的系统里用多个 Agent 时，先选中心调度。等到真的需要跨团队、跨系统协作，再上协议。

我自己还停在第一个阶段：一个 Agent 管博客，写代码时开两三个会话。多 Agent 在编程里怎么落地，我在 [从一个 Agent 到一组 Agent](/blog/ai-tools/multi-agent-development/) 里写了现在的做法。更大规模的部分，这篇只是一个方向上的判断，等真的用上了再回来修订。

## 参考资料

- [Introducing Muse（Meta）](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)
- [Muse (AI agent)（Wikipedia）](https://en.wikipedia.org/wiki/Muse_(AI_agent))
- [Grok Bot（xAI）](https://x.ai/bot)
- [Google introduces Gemini Spark（TechCrunch）](https://techcrunch.com/2026/05/19/google-introduces-gemini-spark-a-24-7-agentic-assistant-with-gmail-integration/)
- [OpenAI launches dots（TNW）](https://thenextweb.com/news/openai-dots-always-on-ai-agents-cloud-computers-devday)
- [Apple introduces Siri AI（Apple）](https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/)
- [千问 App 全面接入淘宝、支付宝、飞猪等阿里生态业务（新浪财经）](https://finance.sina.com.cn/jjxw/2026-01-15/doc-inhhiyxz3472379.shtml)
- [腾讯发布微信 ClawBot 插件（IT 之家）](https://www.ithome.com/0/931/431.htm)
- [不甘心的豆包盯上荣耀（21 经济网）](https://www.21jingji.com/article/20260414/herald/ae00b40b7b15d73261cf3bb7cea6c70b.html)
- [三部门印发《智能体规范应用与创新发展实施意见》（深圳市司法局转载）](https://sf.sz.gov.cn/ztzl/hg/yjxx/zdhy/xxcs/content/post_12860204.html)
- [23款App8款「使不动」：「五大派」围剿豆包手机，实测来了（新京报）](https://m.bjnews.com.cn/detail/1765335074129085.html)
- [豆包手机助手被微信「限制操作」（21 经济网）](https://www.21jingji.com/article/20251203/herald/c5bd5b6275684669e493723dc4c54e94.html)
- [Linux Foundation 成立 Agentic AI Foundation（PR Newswire）](https://www.prnewswire.com/news-releases/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation-aaif-anchored-by-new-project-contributions-including-model-context-protocol-mcp-goose-and-agentsmd-302636897.html)
- [A2A Protocol Surpasses 150 Organizations（Linux Foundation）](https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year)
- [Agentic AI Foundation（GitHub）](https://github.com/aaif)
- [Claude Code：跨会话消息](https://code.claude.com/docs/en/cross-session-messaging)
- [Claude Code：并行运行 Agent 的几种方式](https://code.claude.com/docs/en/agents)
