---
title: EasyExcel/POI 导入含图片的 Excel：锚点归位与 OOM 防护
description: 用 Java 解析业务方提供的含图片 Excel 模板，把图片正确归位到业务字段，并避免大文件导入 OOM
date: 2026-07-16
updated: 2026-07-16
tags:
  - java
  - easyexcel
  - poi
  - excel
status: evergreen
draft: true
---

> 整理自 2025-09 至 2025-10 的商品导入功能实战笔记（垂直表头 + 单元格内嵌图片的模板）。

## 问题

业务方的 Excel 模板里除了文本字段还内嵌图片（商品图），且存在合并单元格、垂直表头。普通的 EasyExcel 行监听器**读不到图片**，需要解决：

1. 图片数据怎么读出来？
2. 图片怎么和它所在的单元格/业务字段对应上？
3. 大文件、多图片导入怎么不把服务打 OOM？

前置知识：EasyExcel 监听器模型、POI 对 Excel 图形对象的表示。

## 核心结论

- 图片属于**额外数据**，必须显式开启：`extraRead(CellExtraTypeEnum.PICTURE)`，在监听器的 `extra` 回调里收集 `CellExtra`。
- 图片位置以**锚点（anchor）坐标**记录，不属于任何"单元格值"——归位靠**坐标映射**：先解析表头行/列坐标建立"单元格 → 业务字段"映射，再按锚点把图片归位；合并单元格需要二次遍历处理。
- OOM 防护三件套：**流式读取 + 图片落临时文件（不驻留内存）+ 图片大小限制**；再配去重规则（按坐标或内容哈希）。
- 图片落盘路径与清理机制做成**可配置**，不写死。

## 原理

### 为什么行监听器读不到图片

Excel 中图片不是单元格内容，而是浮动在工作表上的**图形对象**（Drawing），只通过锚点关联到某个单元格区域。EasyExcel 的行模型只回调单元格值，图形对象走 `extra` 通道，且默认关闭。

### 锚点归位的坑

- 锚点给的是"图片左上角所在单元格"的行列坐标，模板制作不规范时图片可能压线、跨格，需要按锚点范围做容错匹配；
- **合并单元格**：数据值只在合并区左上角，图片锚点却可能落在区内任意格——先解析合并区域信息，把区内坐标统一折算到左上角，再做映射；
- 垂直表（字段名在列而非行）要先扫描表头区建立坐标 → 字段的映射，不能按固定列号取。

### 内存峰值来自哪里

POI 把图片二进制读入内存；一个文件几十张高清图叠加并发导入，峰值轻松过 G。流式读取控制的是单元格数据，**图片必须单独限制**：读到即写临时文件、只在内存中保留路径引用，且对单图大小设上限直接拒绝超标图。

## 实践与验证

### 读取骨架

```java
EasyExcel.read(file, DemoData.class, new AnalysisEventListener<DemoData>() {
    @Override
    public void invoke(DemoData data, AnalysisContext context) {
        // 文本行数据
    }

    @Override
    public void extra(CellExtra extra, AnalysisContext context) {
        if (extra.getType() == CellExtraTypeEnum.PICTURE) {
            // extra.getRowIndex()/getColumnIndex()：锚点坐标
            // 图片字节 → 临时文件，登记坐标 → 路径
        }
    }

    @Override
    public void doAfterAllAnalysed(AnalysisContext context) {
        // 二次遍历：合并区域折算 + 坐标映射 → 业务字段归位
    }
})
.extraRead(CellExtraTypeEnum.PICTURE)
.sheet().doRead();
```

处理顺序：**先收集**（行数据、图片、合并区域）→ **后归位**（`doAfterAllAnalysed` 里统一映射），不要在 `extra` 回调里直接做业务关联。

### 工程化清单

- [ ] 单图大小上限（拒绝超标）+ 单文件图片总数上限
- [ ] 图片按坐标/内容哈希去重
- [ ] 临时文件目录可配置，导入结束/失败均清理
- [ ] 压测样本：真实模板 + 最大预期行数与图片数，验证内存峰值
- [ ] 模板多样性回归用例（有无合并、图片压线、空图占位）

### 排期与风险参考

该功能实际排期拆分：接口契约 → 模板解析 → 图片锚点/合并单元格归位 → 限流与落盘 → 回归用例。主要风险即 POI 图片读取的**内存峰值**与**模板多样性**，压测样本要提前找业务方要真实文件。

## 适用边界

- 基于 EasyExcel 3.x / POI 5.x 的 `.xlsx`（2025-09 验证）；`.xls` 的图形对象 API 不同。
- `extra` 通道只回调**嵌入图片**；通过"单元格图片"新特性（WPS 的 DISPIMG 等）插入的图片不走此通道，需按厂商方案单独处理。
- 浮动图未锚定到数据区（如 logo 装饰图）会被误收集，按坐标白名单过滤。

## 参考资料

- EasyExcel 读额外信息文档：https://easyexcel.opensource.alibaba.com/docs/current/quickstart/read#额外信息读取
- Apache POI Drawing/Picture API：https://poi.apache.org/components/spreadsheet/quick-guide.html#Images
