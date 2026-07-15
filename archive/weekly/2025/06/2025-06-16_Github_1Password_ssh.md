# TIL: GitHub 与 1Password SSH 实践精要

> 归档说明：这是旧版按日期记录的学习笔记，内容未按当前发布标准重新核验。

## 1. GitHub CLI 操作与工程目录管理

- 学会用 `gh repo clone` 快速从 GitHub 组织克隆仓库，理解 clone 的本地目录规则，以及遇到同名目录时如何处理。
- 掌握了 Git 远程仓库地址（origin）的查看、替换与自定义操作方式，便于本地与云端仓库同步。
- 了解了 VS Code Git 面板、命令面板常用快捷键与操作流程（如切换面板、推送、拉取、提交等）。
- 体验到命令行工具与现代编辑器的高效协同，极大提升了日常工程效率。

## 2. SSH 密钥管理与 1Password 集成

- 认识到安全管理 SSH 私钥、避免裸存本地磁盘的重要性。
- 学习如何在 1Password 中生成、存储和管理 SSH 密钥，确保私钥受控且便于多机同步。
- 理解了用 1Password SSH Agent 代替传统 `~/.ssh/id_rsa`，实现无密码安全认证与 GitHub SSH 登录。
- 掌握了如何将公钥添加到 GitHub 账户，配合 1Password 实现“无缝+安全”的 SSH Push/Pull。
- 熟悉了 1Password 插件、Agent 后台服务在终端/IDE 中的具体调用方式，以及常见问题排查方法。

## 3. 实战体会与工程化观点

- 理解到工具链（如 1Password + GitHub + VS Code）组合能显著提升开发效率与账户安全。
- 意识到 SSH Key 与 Token、密码等认证方式的对比优势，特别是在多设备和企业场景下。
- 学会在 TIL 项目里及时记录和总结新知，为后续积累知识资产和团队共享做准备。
- 在多次初始化、clone、push 过程中，遇到目录、身份、历史覆盖等问题，能及时定位并采取修复措施。

---

# 2025-06-16 -2- WSL 安装与网络优化实践记录

今天通过 ChatGPT 的指引，完成了 Windows 子系统 WSL 的手动安装与网络配置优化，构建了初步开发环境并解决 GitHub 连接缓慢的问题。

---

## ✅ 安装 WSL 并导入 Ubuntu 22.04

* 没有使用 Microsoft Store，而是手动下载Ubuntu安装包；
* 利用 `wsl --import` 命令自定义安装路径并导入 Ubuntu 22.04：

  ```bash
  wsl --import Ubuntu-22.04 D:\WSL\Ubuntu2204 ubuntu2204.appx
  ```
* 创建新用户，完成基本初始化；
* 参考资料：[Spencer Woo 的博客指南](https://dowww.spencerwoo.com/)

---

## 🛠 安装 zsh 与 Oh My Zsh

* 安装 zsh 后使用 `chsh -s $(which zsh)` 设置默认 shell；
* 安装 [Oh My Zsh](https://ohmyz.sh/) 以提升交互体验；
* 尚未补充插件，计划后续引入 `zsh-autosuggestions` 与 `zsh-syntax-highlighting`。

---

## 🌐 解决 GitHub 网络访问问题（WSL2 网络优化）

* 遇到 GitHub 链接缓慢问题；
* 参考资料：[lmk123 博客 Issue #89](https://github.com/lmk123/blog/issues/89)；
* 没有采用破坏性做法（如 `sudo rm /etc/resolv.conf`）；
* 而是通过设置 WSL 网络为“镜像宿主机（mirrored）”方式，自动继承 Windows 的 DNS；

---

## 📌 总结

* 搭建了一个干净且受控的 Ubuntu 开发环境；
* 网络设置完成代理，设置镜像仓库等；
* 下一步计划补充命令行工具和 Git 配置，逐步打磨 WSL 使用体验。
