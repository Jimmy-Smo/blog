---
title: MySQL 批量更新与去重：先选中，再回写
description: 用 MySQL 8.0 窗口函数、临时表和 JOIN 安全地做批量更新与去重，并控制误改、长事务和 1093 错误
date: 2026-07-15
updated: 2026-08-28
tags:
  - engineering
  - sql
  - mysql
status: evergreen
draft: false
---

> 整理自 2025-06 至 2025-10 的数据治理记录。示例使用中性表名，适用于 MySQL 8.0。

生产库里的批量更新，难点通常不在 SQL 能不能跑，而在更新范围能不能提前看见，出了问题能不能停下来。我的习惯是先用只读查询算出目标主键，再核对数量和样本，最后才回写。

## 先把目标行固定下来

去重时最常见的规则是按业务键分组，保留最新一条，其余记录软删。`ROW_NUMBER()` 很适合表达这类排序，但不要一上来就把它塞进 `UPDATE`。

先创建临时表，待处理的主键集合就不会在回写过程中继续变化：

```sql
CREATE TEMPORARY TABLE duplicate_ids (
  id BIGINT PRIMARY KEY
);

INSERT INTO duplicate_ids (id)
SELECT id
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id, address_type
      ORDER BY created_time DESC, id DESC
    ) AS rn
  FROM customer_address
  WHERE is_deleted = 0
) AS ranked
WHERE rn > 1;
```

回写前先看总数和样本，确认分组键、排序方向与保护条件都符合预期：

```sql
SELECT COUNT(*) FROM duplicate_ids;

SELECT a.*
FROM customer_address AS a
JOIN duplicate_ids AS d ON d.id = a.id
ORDER BY a.customer_id, a.address_type, a.created_time DESC
LIMIT 100;
```

确认后再开事务。影响行数不对时，在 `COMMIT` 前回滚：

```sql
START TRANSACTION;

UPDATE customer_address AS a
JOIN duplicate_ids AS d ON d.id = a.id
SET
  a.is_deleted = 1,
  a.revised_time = NOW()
WHERE a.is_deleted = 0;

SELECT ROW_COUNT();

-- 核对影响行数后，只执行其中一条：
-- COMMIT;
-- ROLLBACK;
```

临时表不会跟着事务回滚，但其中只保存待处理主键，不影响业务数据。数据量很大时，可以改用带任务编号的中间表，按主键区间分批回写，避免一次事务锁住太多记录。

## 1093 错误到底限制了什么

MySQL 会拒绝一部分“更新目标表，同时又从同一张表的子查询读取”的写法，常见报错是：

```text
You can't specify target table 'customer_address' for update in FROM clause
```

可行的关键是让子查询先物化。上面的临时表最直观，也最方便审计。如果只想写一条语句，可以保留两层派生表：

```sql
UPDATE customer_address AS a
JOIN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY customer_id, address_type
        ORDER BY created_time DESC, id DESC
      ) AS rn
    FROM customer_address
    WHERE is_deleted = 0
  ) AS ranked
  WHERE rn > 1
) AS duplicates ON duplicates.id = a.id
SET
  a.is_deleted = 1,
  a.revised_time = NOW()
WHERE a.is_deleted = 0;
```

窗口函数所在的派生表不能被合并，MySQL 会先算出结果再更新目标表。如果以后把窗口函数改成普通查询，需要重新看执行计划；优化器一旦把派生表合并回去，就要使用临时表，或按官方文档加 `NO_MERGE` 提示。

## 差集查询要先说清楚语义

“左表有、右表没有”可以用 `LEFT JOIN`：

```sql
SELECT i.id
FROM item AS i
LEFT JOIN sync_task AS t ON t.item_id = i.id
WHERE i.is_deleted = 0
  AND t.id IS NULL;
```

如果一条业务记录可能对应多次任务，“没有任务”和“有任务但从未成功”不是同一件事。要找尚未成功同步的记录，用 `NOT EXISTS` 更准确：

```sql
SELECT i.id
FROM item AS i
WHERE i.is_deleted = 0
  AND NOT EXISTS (
    SELECT 1
    FROM sync_task AS t
    WHERE t.item_id = i.id
      AND t.status = 'SUCCESS'
  );
```

这样即使同一条记录同时有失败和成功任务，也不会因为失败行被误选中。

## 回写前的几道保护

- 默认软删，并同步更新操作人与更新时间等审计字段。
- 把不可修改的状态直接写进 SQL，比如用 `NOT EXISTS` 排除已发布或已推送的记录。
- 对关联键和过滤列执行 `EXPLAIN`，确认没有因为缺索引扫描整张大表。
- 大批量更新按主键区间拆开，每批提交后记录范围和影响行数。
- 先备份要修改的字段与主键。修复 SQL 也要准备对应的回滚 SQL。

应用代码里的值一律用预编译参数。MyBatis 的普通值使用 `#{}`，`${}` 只留给无法预编译的标识符，并在进入 SQL 前做白名单校验。

## 什么时候不要直接执行

窗口函数要求 MySQL 8.0 及以上版本。MySQL 5.7 需要改用自连接、变量或中间表，并单独验证排序稳定性。

线上表缺少合适索引、预计更新量很大、当前有长事务，或者保护条件还没有对应的只读查询时，都不适合直接回写。先把目标主键导出来，比在一条复杂 SQL 里同时完成筛选和修改更容易检查。

## 参考资料

- [MySQL 8.0：子查询限制与 1093 处理](https://dev.mysql.com/doc/refman/8.0/en/subquery-restrictions.html)
- [MySQL 8.0：窗口函数](https://dev.mysql.com/doc/refman/8.0/en/window-functions.html)
- [MySQL 8.0：事务语句](https://dev.mysql.com/doc/refman/8.0/en/commit.html)
