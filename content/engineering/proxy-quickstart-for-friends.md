---
title: 给朋友的代理上手说明
description: iPhone 用小火箭，安卓和电脑用 FlClash，线路先到 SS-ID 开最低档试一个月。
date: 2026-11-18T19:15:30+08:00
updated: 2026-11-18
topic: engineering
tags:
  - proxy
status: versioned
draft: false
---

朋友问怎么让手机打开 Google，或者让电脑上的 ChatGPT 不要一直转圈。要备的是两样东西：装在设备上的客户端，和一家按月卖线路的服务，口头叫机场。客户端买一次就能留着，机场不合适就换。

## 先说结论

iPhone 用小火箭。安卓、Windows、Mac 用同一个 FlClash。线路先到 [SS-ID](https://ss-id.com/#/dashboard) 开最低档试一个月，别的机场自己搜。

这家机场自己有客户端，登录就能用。小火箭和 FlClash 是官方客户端不顺手，或者换了一家只给订阅链接的机场时再用。

## 客户端

客户端是设备上的壳，里面没有线路。iPhone 上最省事的壳是小火箭，英文名 Shadowrocket，美区 App Store 标价 2.99 美元，国区商店没有。已有美区或港区 Apple ID 的，直接在 App Store 搜索购买。没有的话，[小信商店这一单](https://xinstore.org/goods/92.html)卖的是已经买好小火箭的苹果 ID，2026-11-18 美国区标价 22 元，页面上还有免税州和香港。只在 App Store 里登录这个账号，下完小火箭就退出。卖家写了，拿到「设置」里登录有锁机风险。更新时先删掉 App 再重新下载，直接更新会提示「禁用」。下单后尽快改掉密码、密保和生日，并打开双重认证。

安卓没有小火箭。要自己装壳时用 [FlClash](https://github.com/chen08209/FlClash/releases)，2026-11-04 的版本是 v0.9.3，以后以下载页最新版为准。海豚测速的清单把它放在安卓优先推荐里，更新勤，订阅进到界面里能直接看节点。安装包从那个 Release 页下，手机一般选带 arm64 的包。还没有线路时，GitHub 常常打不开，第一台设备先用下一节的官方客户端。

Windows 和 Mac 也装 FlClash，和安卓是同一个项目，打开之后在菜单里就能换节点。同一份清单里，这两个系统同样把它放在优先推荐。别的壳还有不少，多一个名字就会多一轮「这两个有什么不一样」。先统一用 FlClash。

想自己挑别的壳，看[海豚测速的代理工具箱](https://www.haitunt.org/app.html)。页面最近一次更新写的是 2026-08-28，价格和是否还在更新都会变，当目录用。

## 机场

我现在让人先开 [SS-ID](https://ss-id.com/#/register)。注册、选套餐、装它自己的客户端再登录，一个账号覆盖 Windows、macOS、Linux、安卓、iPhone、iPad、Apple TV 和 OpenWrt。2026-11-18 首页上的按月价格是 100GB 20 元，往上到 600GB 85 元，同时在线 5 台，流量在账单日重置。先开 100GB 那档。不够用再加，或者换一家。

有两处和首页上的短句不一样，以 2026-10-27 生效的[服务条款](https://tos.ssidcloud.com/)为准。同时在线按公网 IP 计数，同一家里几台设备常常只算一台。上传和下载都算流量，标了倍率的服务器按那个倍数扣。iPhone、iPad、Apple TV 上如果走 App Store 内购，扣款和续费在 Apple 那边，取消得到 Apple ID 的订阅里关。

订阅链接是一串网址，客户端靠它拉取节点。要用小火箭或 FlClash，得先在网站里把这串链接临时打开，再复制进去。官方客户端登录之后会自己处理，链接默认是关的。它等于连接凭证，不要发到群里。条款也写了，用第三方客户端的兼容和安全风险自己承担。不要用它下 BT 或做点对点上传。

别的机场丰俭由己。想比较的时候搜「机场清单」或「机场列表」，看最近几个月的帖子，几年前的月费和节点名经常已经作废。这里不列第二家。

## 装上之后

1. 用常用邮箱打开[注册页](https://ss-id.com/#/register)，买 100GB 那一档。
2. 登录[仪表盘](https://ss-id.com/#/dashboard)，按页面上的说明装官方客户端，用同一个账号登录。iPhone 若被带到 App Store，用外区 Apple ID，并且只在 App Store 登录。
3. 官方客户端够用就停在这里。要换小火箭或 FlClash 时，在网站里临时打开订阅链接，贴进客户端的订阅，更新一次，选一个节点，打开连接。系统第一次会问是否添加 VPN 配置，允许。
4. 流量用完、到期，或者连续几天都连不上，就停掉这家，再去搜别的清单。账号和订阅链接不要借给外人。

## 本文没有覆盖的

路由器、去广告、自己搭节点，都不在这里。壳、内核、订阅这三层分别是什么，这篇不展开。各地规定不一样，用之前看你所在地的要求。

## 参考资料

- 海豚测速代理工具箱，页面自述最近更新 2026-08-28：<https://www.haitunt.org/app.html>
- Shadowrocket，App Store：<https://apps.apple.com/app/shadowrocket/id932747118>
- 已购小火箭的苹果 ID，2026-11-18 页面标价 22 元：<https://xinstore.org/goods/92.html>
- FlClash Releases，2026-11-18 看到的最新版为 v0.9.3（2026-11-04）：<https://github.com/chen08209/FlClash/releases>
- SS-ID 首页价格与平台列表，核验于 2026-11-18：<https://ss-id.com/>
- SSID 服务条款，生效日 2026-10-27：<https://tos.ssidcloud.com/>
