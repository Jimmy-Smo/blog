---
title: "Batch updates and deduplication in MySQL: select first, then write back"
description: Using MySQL 8.0 window functions, temporary tables, and JOINs to run batch updates and deduplication safely, while guarding against wrong edits, long transactions, and error 1093.
date: 2026-07-15
updated: 2026-08-28
topic: engineering
tags:
  - mysql
status: evergreen
draft: false
---

> Compiled from data-cleanup notes taken between 2025-06 and 2025-10. Examples use neutral table names and apply to MySQL 8.0.

With batch updates on a production database, the hard part usually isn't whether the SQL runs. It's whether you can see the scope of the update in advance, and whether you can stop if something goes wrong. My habit is to compute the target primary keys with a read-only query first, check the count and a sample, and only then write back.

## Pin down the target rows first

The most common dedup rule is to group by a business key, keep the newest row, and soft-delete the rest. `ROW_NUMBER()` expresses that ordering well, but don't put it straight into an `UPDATE`.

Create a temporary table first, so the set of keys to process can't keep changing while you write back:

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

Before writing back, look at the total and a sample to confirm the grouping key, sort direction, and guard conditions are what you expect:

```sql
SELECT COUNT(*) FROM duplicate_ids;

SELECT a.*
FROM customer_address AS a
JOIN duplicate_ids AS d ON d.id = a.id
ORDER BY a.customer_id, a.address_type, a.created_time DESC
LIMIT 100;
```

Only then open a transaction. If the affected row count is wrong, roll back before `COMMIT`:

```sql
START TRANSACTION;

UPDATE customer_address AS a
JOIN duplicate_ids AS d ON d.id = a.id
SET
  a.is_deleted = 1,
  a.revised_time = NOW()
WHERE a.is_deleted = 0;

SELECT ROW_COUNT();

-- After checking the affected rows, run exactly one of these:
-- COMMIT;
-- ROLLBACK;
```

The temporary table isn't rolled back with the transaction, but it only holds the keys to process, so business data is unaffected. For very large volumes, use an intermediate table with a job ID instead and write back in batches by primary-key range, so a single transaction doesn't lock too many rows.

## What error 1093 actually restricts

MySQL rejects some statements that update a table while reading from the same table in a subquery. The usual error is:

```text
You can't specify target table 'customer_address' for update in FROM clause
```

The key to making it work is getting the subquery materialized first. The temporary table above is the most straightforward and the easiest to audit. If you want a single statement, keep two levels of derived tables:

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

A derived table containing a window function can't be merged, so MySQL computes the result before updating the target table. If you later replace the window function with an ordinary query, check the execution plan again: once the optimizer merges the derived table back in, you need a temporary table or, per the official docs, a `NO_MERGE` hint.

## Be clear about the semantics of a set difference

"In the left table but not the right" can be written with `LEFT JOIN`:

```sql
SELECT i.id
FROM item AS i
LEFT JOIN sync_task AS t ON t.item_id = i.id
WHERE i.is_deleted = 0
  AND t.id IS NULL;
```

If one business record can have several tasks, "has no task" and "has tasks but none succeeded" are different things. To find records that have never synced successfully, `NOT EXISTS` is more precise:

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

That way a record with both failed and successful tasks isn't picked up because of its failed rows.

## Guards before writing back

- Soft-delete by default, and update audit fields such as operator and update time at the same time.
- Write states that must not change directly into the SQL, for example using `NOT EXISTS` to exclude records that are already published or pushed.
- Run `EXPLAIN` on the join keys and filter columns to make sure a missing index isn't causing a full scan of a large table.
- Split large updates by primary-key range, and record the range and affected rows after each batch commits.
- Back up the primary keys and the fields you're about to change. Every fix SQL should have a matching rollback SQL.

In application code, always pass values as prepared-statement parameters. In MyBatis, use `#{}` for ordinary values and reserve `${}` for identifiers that can't be parameterized, validating them against an allowlist before they reach the SQL.

## When not to run it directly

Window functions require MySQL 8.0 or later. On MySQL 5.7 you need a self-join, variables, or an intermediate table, and you need to verify sort stability separately.

Don't write back directly if the table lacks a suitable index, the expected update volume is large, there's a long transaction running, or a guard condition doesn't yet have a matching read-only query. Exporting the target keys first is easier to check than doing the selection and the modification in one complex statement.

## References

- [MySQL 8.0: restrictions on subqueries and handling error 1093](https://dev.mysql.com/doc/refman/8.0/en/subquery-restrictions.html)
- [MySQL 8.0: window functions](https://dev.mysql.com/doc/refman/8.0/en/window-functions.html)
- [MySQL 8.0: transaction statements](https://dev.mysql.com/doc/refman/8.0/en/commit.html)
