---
title: macOS 代理工具栈：Surge + AdGuard 组合与网络排错
description: 在 macOS 上搭建稳定的代理与广告过滤组合，理解代理链路冲突的成因，并掌握一套网络诊断命令
date: 2026-07-15
updated: 2026-08-29
tags:
  - engineering
  - proxy
status: versioned
draft: false
---

> 整理自 2025-06 至 2025-10 的笔记，验证环境为 macOS 15.5 到 26、Surge 5、AdGuard for macOS。

macOS 上同时需要“流量分流”和“系统级广告过滤”，会遇到一串连带问题：代理工具怎么选、Surge 与 AdGuard 同开后出站行为不可预期怎么定位、终端/IDE/Git 的代理怎么与 GUI 工具对齐、网络不通时用什么命令组合排查。这篇把选型、冲突根因和一套排错流程放在一起。

## 选型：Surge、Stash 还是 Clash 系

需要复杂策略、脚本与调试时，我会选 **Surge**；只需要基础代理时，**Stash** 的配置更简单。2025 年在同一台 Mac 上观察到 Stash 稳态约 230 MB，Clash Verge 双进程常驻峰值超过 800 MB，这组数据只用于比较当时的版本，不能代表其他机器和后续版本。

## TUN 与系统代理/PAC 为什么会打架

先分清三个概念：

- **系统代理**：应用自愿遵守的 HTTP/SOCKS 设置，CLI 工具默认不读；
- **PAC**：按脚本决定每个请求走哪个代理，同样依赖应用配合；
- **TUN（增强模式）**：创建虚拟网卡接管**所有** IP 流量，不依赖应用配合。

TUN 已经在 IP 层接管流量，再叠加系统代理、PAC 或另一套 DNS 重定向时，两套工具可能同时改路由和解析结果。TUN 与系统代理并非必然冲突，但出问题后很难判断流量经过了哪一层。我的处理原则是只留一个流量入口，再把另一个工具接到它的上游或下游。

## HTTPS 过滤依赖 MITM 证书

AdGuard 开启 HTTPS 过滤后，需要由官方应用安装过滤证书并让系统信任。证书只从应用内安装，出现警告时先检查证书状态与排除列表。启用证书固定（certificate pinning）的应用不能被这类方式过滤，需要加入排除列表。

## 代理链配置：两条链路不要交叉

需要同时保留 AdGuard 系统过滤和 Surge 分流时，可以让 AdGuard 做流量入口，把 Surge 配成它的出站代理。终端与 IDE 不需要广告过滤，可以直接指向 Surge HTTP 代理 `127.0.0.1:6152`。配置步骤如下：

1. Surge：关闭增强模式，确认 HTTP 端口 6152、SOCKS5 端口 6153；
2. AdGuard：保持保护开启，在 Network 的 Outbound proxy 中填 Surge SOCKS5 `127.0.0.1:6153`；
3. 不再手动叠加系统代理或 PAC，让 AdGuard 负责系统流量入口；
4. 终端/IDE：

   ```bash
   export http_proxy=http://127.0.0.1:6152
   export https_proxy=http://127.0.0.1:6152
   ```

5. 验证：`curl http://whatismyip.akamai.com/` 看出口 IP；访问广告密集站点看过滤效果。

> 若改用 **TUN 模式**，不要沿用上面的代理链配置。先只开启 Surge 增强模式，确认网络正常后，再逐项启用 AdGuard 的功能；一旦出现路由、DNS 或证书异常，就回到单一流量入口。不同 macOS 与应用版本的 Network Extension 行为可能变化，选项名称以当时界面为准。

## 精细分流与例外

按进程绕过代理（规则需放在通用规则之前，用实时日志验证）：

```text
PROCESS-NAME,"Microsoft Edge Helper",DIRECT
```

Git 侧单仓库禁用代理 / 临时跳过：

```bash
git -C <repo> config --local --unset http.proxy
env http_proxy= https_proxy= git clone <url>
```

IDEA 中关闭 "Use IDE proxy settings for Git"，避免 IDE 与终端行为不一致。

## 网络诊断速查

排错按这个组合走：`ping`（连通性）→ `traceroute`（路径）→ `nc/telnet`（TCP 可达）→ `curl -v`（HTTP 细节）→ `dig +trace`（DNS 链路）。两个容易误读的现象：traceroute 的星号只表示中间节点不回 ICMP 或报文被过滤，**不必然是端到端丢包**；Surge 增强模式里出现 `198.18.x.x`，通常是它为域名分配的 fake IP，`198.18.0.0/15` 本身也是 IANA 预留的网络设备基准测试地址段。

| 目的 | 命令 |
|------|------|
| 连通性/抖动 | `ping <host>` |
| 路径追踪 | `traceroute <host>` |
| TCP 端口可达 | `nc -vz <host> <port>`；`telnet` 逃逸键 `^]`（Ctrl+]） |
| HTTP 细节 | `curl -v <url>` |
| DNS 解析链路 | `dig <domain> +trace`，对比 `resolv.conf`/网络偏好设置 |
| 本机监听端口 | macOS 用 `lsof -iTCP:<port> -sTCP:LISTEN -n -P`（`ss` 是 Linux 工具） |

## 适用范围

端口 6152/6153 是 Surge 默认值，改过配置以实际为准。结论基于 Surge 5 与 2025 年版本的 AdGuard/Stash，GUI 选项名称可能随版本调整。MITM 过滤对启用证书固定（certificate pinning）的应用无效。“明确定义哪条链路用哪个出口”比追求全自动更可维护，VPN/多代理并存时尤其如此。

## 参考资料

- [Surge 官方手册](https://manual.nssurge.com/)
- [Surge DNS 与 fake IP](https://manual.nssurge.com/dns/advanced.html)
- [AdGuard for Mac 文档](https://adguard.com/kb/adguard-for-mac/overview/)
