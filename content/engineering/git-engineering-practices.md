---
title: Git 工程实践：SSH 凭据、日常工作流与发布流程
description: 用 1Password 管理 SSH 密钥、gh CLI 管理仓库、worktree 并行开发，以及 release 分支到打 tag 的发布基线
date: 2026-07-16
updated: 2026-07-16
tags:
  - engineering
  - git
  - github
  - ssh
status: evergreen
draft: true
---

> 整理自 2025-06 至 2025-10 的实践笔记，覆盖 macOS 与 WSL 两种环境。

## 问题

围绕 Git 的四类日常问题：

1. SSH 私钥怎么存才安全，又能多机同步？
2. 多仓库/组织仓库的克隆、转移、远程地址管理怎么做高效？
3. 主分支开发中途要紧急修复，怎么避免 stash 来回倒？
4. 版本发布在哪个分支做版本号、在哪打 tag？

## 核心结论

- **私钥进 1Password，不裸存磁盘**：用 1Password SSH Agent 替代 `~/.ssh/id_rsa`，同一把 ed25519 公钥在 GitHub **双上传**（一次 Authentication Key、一次 Signing Key），同时解决登录与提交签名。
- **仓库操作用 gh CLI**：`gh repo clone` + 浏览器登录，比网页操作和手动 Token 都高效；clone 前先 `cd` 到目标目录。
- **并行开发用 `git worktree`**，不用 stash 切分支。
- **发布基线**：release 分支完成**版本号提升 + CHANGELOG 更新** → 合并 main → 在 **main 上打 tag** → 生成 Release Notes；流程写进 `RELEASING.md`。
- WSL 下 Git 凭据方案实测：libsecret helper 折腾后未生效，**最终结论是直接用 SSH key**，不走 HTTPS 凭据。

## 原理

### 为什么用 SSH Agent 而不是磁盘私钥

私钥落盘的风险是任意进程可读、备份易泄露；1Password SSH Agent 把私钥保存在加密库中，签名操作在 Agent 内完成，终端和 IDE 通过 socket 调用，私钥永不落盘，且随 1Password 多机同步。

### 为什么 tag 统一打在 main

tag 标记的是"对外可回溯的稳定版本"。打在 release 分支上，合并后 commit 关系变化会导致 tag 与 main 历史脱节；统一在 main 打 tag，才能与 CI 产物、回滚点严格对齐。

### worktree 的机制

`git worktree` 为同一仓库检出多个工作目录，共享 `.git` 对象库。主分支开发中途来紧急修复时，另开一个 worktree 即可，两边工作区互不干扰。

## 实践与验证

### 1Password SSH 配置（macOS）

`~/.ssh/config`：

```text
Host *
  IdentityAgent "~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
  IdentitiesOnly yes
```

GitHub 侧同一公钥上传两次：Settings → SSH keys 中分别选 **Authentication Key** 与 **Signing Key**；Git 签名用 1Password 的 `op-ssh-sign`。验证：`ssh -T git@github.com`。

### WSL 的凭据结论

WSL 下走 HTTPS + libsecret helper 需要 `dbus-x11`、`libsecret`，而且要手动编译 helper。实测装完仍未生效，**直接生成 SSH key 最省事**：

```bash
ssh-keygen -t ed25519 -C "you@example.com"
eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub | clip.exe   # 复制到 GitHub
ssh -T git@github.com
```

临时场景可用凭据缓存：`git config --global credential.helper 'cache --timeout=604800'`。

### 仓库日常操作

```bash
gh repo clone <org>/<repo>            # 先 cd 到目标目录再执行
git remote -v                          # 查看远程地址
git remote set-url origin git@github.com:<org>/<repo>.git   # 转移/改名后同步
```

- 仓库转移到组织：需目标组织先接受/邀请协作者，否则 CLI 报 422。
- 解压覆盖项目目录可能连 `.git` 一起覆盖，导致历史丢失。重要仓库操作前应备份 `.git`，否则只能重新 init 并关联远程。
- `.gitignore` 调整后让已跟踪文件生效：

  ```bash
  git rm -r --cached .
  git add . && git commit -m "chore: refresh .gitignore"
  ```

### worktree 并行开发

```bash
git worktree add -b hotfix ./hotfix master   # 基于 master 检出 hotfix 到 ./hotfix
git worktree list
git worktree remove ./hotfix
```

### 提交规范（Conventional Commits）

`feat` 新功能 / `fix` 修复 / `docs` 文档 / `style` 格式 / `refactor` 重构 / `perf` 性能 / `test` 测试 / `chore` 构建与工具 / `revert` 回滚。

### 发布流程

```text
release/x.y.z 分支：提版本号 + 更新 CHANGELOG.md
  → PR 合并 main
  → main 上：git tag vX.Y.Z && git push --tags
  → 生成 Release Notes，记录回滚点
  → release 合回 dev（解决冲突后 push）
```

### 代理环境下的 Git

- 单仓库禁用代理：`git -C <repo> config --local --unset http.proxy`（`https.proxy` 同步）；
- 临时跳过：`env http_proxy= https_proxy= git clone <url>`；
- IDEA 关闭 "Use IDE proxy settings for Git"，保持 IDE 与终端行为一致。

### 附：开源 License 速查

| 许可证 | 传播性 | 商用 | 专利授权 | 适用 |
|--------|--------|------|----------|------|
| MIT | 宽松 | ✅ | ❌ | 库、脚手架 |
| Apache-2.0 | 宽松 | ✅ | ✅ | 企业友好 |
| GPL-3.0 | 传染 | ✅ | ✅ | 保证衍生品开源 |
| BSD-3 | 宽松 | ✅ | ❌ | 学术项目 |
| MPL-2.0 | 文件级 | ✅ | ✅ | 插件类 |
| CC0 | 公共领域 | ✅ | ❌ | 数据集/示例 |

## 适用边界

- 1Password SSH Agent 的 socket 路径为 macOS 下的默认值，Windows/Linux 路径不同，以官方文档为准。
- 发布基线适用于"release 分支 + main + dev"的分支模型；trunk-based 团队直接在 main 打 tag。
- WSL libsecret 的失败结论是 2025-06 在 Ubuntu 22.04 上的实测，新版本可能已改善，但 SSH key 方案始终更简单。

## 参考资料

- 1Password SSH Agent：https://developer.1password.com/docs/ssh/
- git-worktree 文档：https://git-scm.com/docs/git-worktree
- Conventional Commits：https://www.conventionalcommits.org/
- Choose a License：https://choosealicense.com/
