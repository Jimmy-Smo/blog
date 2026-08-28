---
title: macOS 代理工具栈：Surge + AdGuard 组合与网络排错
description: 在 macOS 上搭建稳定的代理与广告过滤组合，理解代理链路冲突的成因，并掌握一套网络诊断命令
date: 2026-07-15
updated: 2026-08-29
tags:
  - engineering
  - network
  - macos
  - proxy
status: versioned
draft: true
---

> 整理自 2025-06 至 2025-10 的笔记，验证环境为 macOS 15.5–26、Surge 5、AdGuard for macOS。

macOS 上同时需要“流量分流”和“系统级广告过滤”，会遇到一串连带问题：代理工具怎么选、Surge 与 AdGuard 同开后出站行为不可预期怎么定位、终端/IDE/Git 的代理怎么与 GUI 工具对齐、网络不通时用什么命令组合排查。这篇把选型、冲突根因和一套排错流程放在一起。

## 选型：Surge、Stash 还是 Clash 系

需要复杂策略、脚本与调试选 **Surge**（买断制）；纯代理、省内存选 **Stash**（稳态约 230 MB）；**Clash Verge** 双进程常驻峰值 800 MB+，资源敏感场景不推荐。

## TUN 与系统代理/PAC 为什么会打架

先分清三个概念：

- **系统代理**：应用自愿遵守的 HTTP/SOCKS 设置，CLI 工具默认不读；
- **PAC**：按脚本决定每个请求走哪个代理，同样依赖应用配合；
- **TUN（增强模式）**：创建虚拟网卡接管**所有** IP 流量，不依赖应用配合。

TUN 已经在 IP 层接管流量，此时再叠一层系统代理/PAC/DNS 重定向，就会出现“谁先抢到谁处理”的竞争——这是 Surge × AdGuard 冲突的本质：Surge 增强模式（TUN）与 AdGuard 的系统过滤/自动代理（PAC）/DNS 保护都会抢占系统代理与路由，同开必乱。修复方式：AdGuard 关掉这三项，Surge 只开增强模式，不再手动设系统代理。

## HTTPS 过滤依赖 MITM 证书

AdGuard/Stash 过滤 HTTPS 广告需要安装根证书并在钥匙串中设为“始终信任”；出现证书警告先检查信任状态。

## 代理链配置：两条链路不要交叉

链路对齐的原则：终端与 IDE 统一指向 Surge HTTP 代理 `127.0.0.1:6152`；如用 AdGuard 接管系统代理，其上游设为 Surge SOCKS5 `127.0.0.1:6153`，两条链路不要交叉。配置步骤（代理链模式）：

1. Surge：确认 HTTP 端口 6152、SOCKS5 端口 6153；
2. AdGuard：Settings → Network 启用 Proxy，上游填 `127.0.0.1:6153`；Settings → HTTPS 安装根证书并信任；
3. 系统代理指向 `127.0.0.1:6152`（不要指向 AdGuard 端口）；
4. 终端/IDE：

   ```bash
   export http_proxy=http://127.0.0.1:6152
   export https_proxy=http://127.0.0.1:6152
   ```

5. 验证：`curl http://whatismyip.akamai.com/` 看出口 IP；访问广告密集站点看过滤效果。

> 若改用 **TUN 模式**：Surge 开增强模式即可，AdGuard 关闭“自动过滤应用流量 / 自动代理(PAC) / DNS 保护”，系统代理无需设置。变更后核对路由表与系统代理状态确认生效。

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

排错按这个组合拳走：`ping`（连通性）→ `traceroute`（路径）→ `nc/telnet`（TCP 可达）→ `curl -v`（HTTP 细节）→ `dig +trace`（DNS 链路）。两个容易误读的现象：traceroute 的星号只表示中间节点不回 ICMP/被丢弃，**不必然是丢包**；路径中出现 `192.18.0.1` 之类地址是保留/测试网段或运营商内部节点，不用惊慌。

| 目的 | 命令 |
|------|------|
| 连通性/抖动 | `ping <host>` |
| 路径追踪 | `traceroute <host>` |
| TCP 端口可达 | `nc -vz <host> <port>`；`telnet` 逃逸键 `^]`（Ctrl+]） |
| HTTP 细节 | `curl -v <url>` |
| DNS 解析链路 | `dig <domain> +trace`，对比 `resolv.conf`/网络偏好设置 |
| 本机监听端口 | macOS 用 `lsof -iTCP:<port> -sTCP:LISTEN -n -P`（`ss` 是 Linux 工具） |

## 适用范围

端口 6152/6153 是 Surge 默认值，改过配置以实际为准。结论基于 Surge 5 与 2025 年版本的 AdGuard/Stash，GUI 选项名称可能随版本调整。MITM 过滤对启用证书固定（certificate pinning）的应用无效。“明确定义哪条链路用哪个出口”比追求全自动更可维护——VPN/多代理并存时尤其如此。

## 参考资料

- [Surge 官方手册](https://manual.nssurge.com/)
- [AdGuard for Mac 文档](https://adguard.com/kb/adguard-for-mac/overview/)
