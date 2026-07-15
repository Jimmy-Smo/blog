# 2025-06-22 \~ 2025-06-23 学习笔记

> 归档说明：这是旧版按日期记录的学习笔记，内容未按当前发布标准重新核验。

## 网络工具实践总结：Stash（iOS）、Surge+AdGuard（macOS）

---

### 1. Stash for iOS 使用要点

- **规则导入与广告过滤**
  - 主要通过 *Override* 功能导入自定义规则，例如可莉去广告脚本：[Remove\_ads\_by\_keli](https://clashios.app/stoverride/lodepuly_vpn_tool/Remove_ads_by_keli)。
  - 完成证书安装，实现中间人（MITM）过滤 HTTPS 广告。
- **机场订阅管理**
  - 使用 [DuangKS 在线订阅转换](https://a.duangks.com/) 将机场订阅批量转换为 Stash 格式，一键导入。
- **Script Hub 摘要**
  - 暂未深度使用磁贴，仅导入，以备后续本地自动化需求。

---

### 2. Surge + AdGuard for macOS 实践

- **总体方案**：Surge 负责流量分流与科学上网，AdGuard 负责系统级广告与隐私过滤。

#### 代理链路与端口

- AdGuard 接管系统代理，上游设置为 Surge 的 SOCKS5 127.0.0.1:6153。
- 终端与开发环境使用 Surge 的 HTTP 代理 127.0.0.1:6152，避免 AdGuard 重复拦截。

#### 配置步骤

1. **安装与检查 Surge**
   - 下载并安装 Surge macOS，首次启动完成激活。
   - 打开 Surge 设置，确认 **HTTP Proxy Port**（默认 6152）与 **SOCKS5 Proxy Port**（默认 6153）。
2. **安装与配置 AdGuard**
   - 下载 AdGuard for macOS 并打开。
   - 在 **Settings → Network** 中启用 “Enable Proxy”，填写 **127.0.0.1:6153**（Surge SOCKS5）。
   - 在 **Settings → HTTPS** 中安装根证书，并在“钥匙串访问”中设为“始终信任”。
3. **系统代理调整**
   - macOS 系统偏好 → 网络 → 当前网络 → 高级 → 代理
     - 勾选 HTTP、HTTPS 代理，填写 **127.0.0.1:6152**。
     - 不要同时指向 AdGuard 端口，保持代理链清晰。
4. **终端及 IDE 配置**
   - 在 shell 配置中：
     ```bash
     export http_proxy=http://127.0.0.1:6152
     export https_proxy=http://127.0.0.1:6152
     ```
   - 在 IntelliJ/VSCode 等 IDE 网络设置，填写 HTTP 代理 127.0.0.1:6152。
5. **验证与故障排查**
   - 访问 `http://whatismyip.akamai.com/`，检测出口 IP 是否为科学上网节点。
   - 访问广告密集网站，确认 AdGuard 过滤效果。
   - 出现证书警告时，回到钥匙串检查 AdGuard 证书是否被信任。

---

## 个人实践要点

- **Stash**：以 Override + 机场订阅为主，脚本功能按需深入。
- **macOS 网络**：Surge+AdGuard 组合最佳，Surge 分流，AdGuard 净化。
- **证书链**：HTTPS 广告过滤依赖根证书完全信任，必要时重新安装或信任。

---

## 参考与工具链接

- [Remove\_ads\_by\_keli](https://clashios.app/stoverride/lodepuly_vpn_tool/Remove_ads_by_keli)
- [DuangKS 机场订阅转换](https://a.duangks.com/)
