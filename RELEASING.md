# 发布流程

本仓库使用 `dev` 准备发布，通过 PR 合并到 `main`。版本号采用语义化版本（若本轮需要打标签）。

本仓库以公开 Markdown 内容为主，**可以没有**根目录 `VERSION` 文件。若打标签：

- 标签名为纯版本号（如 `0.3.0`），**不加** `v` 前缀
- 在 PR / Release 说明里写清本版包含的 `content/` 变化

## 分支约定

| 分支 | 角色 |
|------|------|
| `dev` | 日常整理与发布准备；可领先 `main` |
| `main` | 已合并的稳定公开内容 |

发布或任意 `dev → main` PR 合并后，`dev` 应**接上** `main` tip（behind 为 0）。默认 **merge `main` → `dev`**，不要默认 force 用 `main` 覆盖远端 `dev`。

发版之后继续写在 `dev` 上的内容属于下一轮发布，不要回改已打标签 Release 的说明。

## 发布步骤

1. 在 `dev` 完成内容整理；正式文档 frontmatter 完整（`title`、`date`/`updated`、`tags`、`status`、`draft: false` 等）。
2. 若本轮要打版本标签：准备 CHANGELOG 式说明（Release notes 或单独记录），版本号前后一致。
3. 自检：无密钥与未脱敏隐私；内部链接可解析；`draft` 不为公开误开。
4. 推送 `dev`，创建从 `dev` 到 `main` 的 PR。
5. 确认检查通过后合并 PR。
6. （可选）在合并后的 `main` 上打标签并发布 GitHub Release：

   ```bash
   git checkout main
   git pull origin main
   git tag <version>          # 例：0.3.0，无 v 前缀
   git push origin <version>
   gh release create <version> --generate-notes --title "<version> 简短中文标题"
   # 或：--notes-file / GitHub UI；勿留草稿
   ```

   若本轮只合内容、不打点版本，可跳过本步，但仍须做步骤 7。

7. **把 `main` 回灌进 `dev`**，避免 `dev` behind `main`。

   ```bash
   # 回灌前：工作区干净；该 push 的提交已 push
   git checkout dev
   git pull origin dev
   git merge origin/main
   git push origin dev
   ```

   确认 `dev` 相对 `origin/main`：**behind 为 0**（可以 ahead）。

8. （可选）本地 `dev` 指针混乱时：

   ```bash
   git checkout main
   git branch -D dev
   git checkout -b dev origin/dev
   ```

   **不要**默认 force 重置远端 `dev` 到 `main`。

## 发布核对

- [ ] 公开文档非 draft；链接与 frontmatter 抽查通过
- [ ] 若打标签：标签 / Release 版本一致，无 `v` 前缀；Release 非草稿
- [ ] `main` 与 `dev` 均已推送；`dev` 相对 `main` **behind 为 0**（允许 ahead）
- [ ] 无密钥、未脱敏隐私
