---
title: SQL 安全更新与去重范式
description: 在生产 MySQL 上安全地做批量更新、去重清理和差集查询，避开 1093 错误、数据截断和误删
date: 2026-07-15
updated: 2026-07-15
tags:
  - engineering
  - sql
  - mysql
status: evergreen
draft: true
---

# SQL 安全更新与去重范式

> 整理自 2025-06 至 2025-10 多次生产数据治理实战（去重清理、超额推送统计、识别任务排查）。

## 问题

在生产库上做批量更新/清理时反复遇到几类问题：

1. `UPDATE` 目标表同时出现在子查询里，报 MySQL **1093** 错误；
2. 去重规则复杂（保留最新一条 / 保留最早一条 / 按状态分组处理）；
3. 需要找"左表有、右表没有"的差集（未提交、未同步的记录）；
4. 写入报 `SQLSyntaxErrorException` 或数据截断；
5. 误删已发布/已推送的记录。

## 核心结论

- **两步走范式**：先用**窗口函数**在只读 SELECT 中算出目标行集，再 `JOIN` 回写做软删/标记，天然规避 1093。
- **差集固定写法**：`LEFT JOIN ... ON ... WHERE right.id IS NULL`。
- **治理脚本三件套**：软删不硬删 + 保护条件（`NOT EXISTS` 排除已推送/已发布）+ 关联键与过滤列加索引。
- **先演练后执行**：任何回写前，先跑等价的只读 SELECT 核对行数与样本。
- 应用层永远用预编译占位符（MyBatis `#{}`），禁用 `${}` 拼接。

## 原理

### 1093 错误的成因

MySQL 不允许 `UPDATE`/`DELETE` 的目标表同时作为其子查询的数据源（同一语句内读写同表）。两步走本质是把"读"物化成派生表/中间结果，再与目标表 JOIN，读写路径分离。

### 窗口函数选"保留行"

`ROW_NUMBER() OVER (PARTITION BY <业务键> ORDER BY <时间/ID>)` 给组内记录排名：`rn = 1` 即保留行（最新或最早取决于排序方向），`rn > 1` 是待清理行。比自 JOIN 取 `MAX()` 更直观，且能表达复杂排序。

### 软删 + 保护条件

生产清理的不可逆风险来自硬删和规则漏判。软删（`is_deleted = 1`）留退路；保护条件用 `NOT EXISTS` 显式排除不可动的记录（已推送、已发布），把"哪些绝不能删"写进 SQL 而不是靠人肉核对。

## 实践与验证

### 差集：未提交或失败的记录

```sql
-- 找出没有提交识别任务、或提交但失败的 design_code
SELECT DISTINCT skc.design_code
FROM skc
LEFT JOIN ai_color_task t ON t.skc_id = skc.skc_id
WHERE skc.is_deleted = 0
  AND (t.task_id IS NULL
       OR t.status IN ('FAILED', 'TIMEOUT', 'CANCELLED'));
```

索引：`ai_color_task(skc_id, status)`、`skc(skc_id, is_deleted, design_code)`，避免回表放大。

### 去重：保留最新一条（两步走）

```sql
UPDATE target t
JOIN (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY biz_key ORDER BY created_time DESC, id DESC) AS rn
  FROM target
  WHERE is_deleted = 0
) d ON t.id = d.id
SET t.is_deleted = 1
WHERE d.rn > 1;
```

### 分组条件清理：两类规则用 UNION 合并

场景（禁用 WITH 时）："组内存在 `style_status = 2` → 只删非 2 且在时间窗内的记录；组内不存在 → 保留最早一条，删其余"。两条规则分别写 SELECT，`UNION` 合并成待删 ID 集，再 JOIN 回写。

### 执行前检查清单

- [ ] 只读 SELECT 演练，核对行数与抽样记录
- [ ] 保护条件（`NOT EXISTS` 已推送/已发布）已加
- [ ] 软删而非硬删；审计字段（`reviser/revised_time`）同步更新
- [ ] 关联键、过滤列索引已确认（`EXPLAIN` 验证）
- [ ] 大字段扩容前先 `LEFT(val, N)` 截断回放验证

### 报错速查

| 报错 | 排查方向 |
|------|---------|
| 1093 | 改两步走：窗口函数派生表 + JOIN 回写 |
| 数据截断 / `SQLSyntaxErrorException` | 字段长度与类型、字符集与排序规则、保留字、隐式转换 |
| `ORDER BY DESC` 语法错 | 标准写法 `ORDER BY <col> DESC`，多列 `ORDER BY created_time DESC, id DESC` |

## 适用边界

- 窗口函数要求 **MySQL 8.0+**；5.7 需改用变量法或自 JOIN。
- 两步走的 JOIN 回写在超大表上应分批执行（按 ID 区间），避免长事务与锁放大。
- `UNION` 合并规则的写法针对禁用 CTE 的环境；能用 `WITH` 时可读性更好。

## 参考资料

- MySQL 8.0 窗口函数文档：https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL Error 1093 说明：https://dev.mysql.com/doc/refman/8.0/en/update.html
