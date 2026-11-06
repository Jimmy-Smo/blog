---
title: Excel 图片导入：难点不只是读单元格
description: 用 Apache POI 区分图片资源与摆放位置，为固定 xlsx 模板建立图片到业务行的索引，并处理合并单元格、重复图片和内存边界。
date: 2026-11-06
updated: 2026-11-06
topic: engineering
tags:
  - java
status: versioned
draft: false
---

表格里一行商品配一张图片，看起来像「多读一个字段」。但普通浮动图片属于绘图对象，和单元格里的商品编码不在同一套存储结构中。能读出图片字节，不代表已经知道它属于哪行商品。

我在旧笔记里记过图片锚点、合并单元格、去重和内存峰值这些风险。这次把范围收窄到固定模板的 `.xlsx` 浮动图片，做了一个最小索引示例，不把它当作能接受任意 Excel 文件的通用导入器。

示例固定使用 JDK 21、Apache POI 5.4.1，核验日期为 2026-11-06。[完整代码和生成样例的测试](https://github.com/Jimmy-Smo/blog/tree/main/examples/backend-notes)随文章提供。

## 图片资源和图片位置要分开看

`.xlsx` 是 OOXML 包。图片资源和绘图中的位置引用是两回事：同一份图片可以在多个位置摆放，也可以跨工作表引用。

POI 的 `workbook.getAllPictures()` 能枚举图片数据，不能直接回答「这张图属于哪个商品」。要建立业务关联，需要遍历工作表的 drawing，找到 `XSSFPicture`，再读取锚点。

对支持单元格锚点的浮动图片，可以从这里取得起点：

```java
XSSFClientAnchor anchor = picture.getClientAnchor();
int rowIndex = anchor.getRow1();
int columnIndex = anchor.getCol1();
```

行列号从零开始，给用户展示错误位置时再加一。锚点也可能为空，不能省掉检查。

图片视觉上覆盖某一行，不等于它的起始锚点就在那行。图片跨行、拖动或缩放后，按中心点、左上角或最大覆盖面积归属，都可能得出不同结果。程序需要一条模板规则，不能靠遍历图片的先后顺序猜商品顺序。

## 先把模板约束写下来

示例只接受下面这套规则：

| 项目 | 约定 |
| --- | --- |
| 第一行 | 表头 |
| A 列 | 业务编码，图片所在数据行必须非空 |
| B 列 | 图片起点列 |
| 图片位置 | 按左上角单元格锚点归属 |
| 横向合并图片单元格 | 锚点归一到合并区域左上角 |
| 跨业务行的纵向合并 | 拒绝，不猜属于哪行 |

例如 B3:C3 是同一行的图片区域，图片起点落在 C3，可以归一到 B3，再从 A3 读取编码。B3:B4 跨了两条潜在数据行，则要求修改模板。

这个选择会拒绝一部分人眼看起来没问题的表格，但错误可以定位和解释。静默把图片挂到上一条非空商品上，可能让导入表面成功、关联关系却错了。

## 索引先保留位置，再考虑去重

示例为每个摆放位置生成一条记录：

```java
public record Ref(
    String sheet,
    int rowIndex,
    int columnIndex,
    String itemCode,
    String sha256
) {}
```

`sheet + 行列位置` 表达这一次摆放，`itemCode` 表达它对应的数据行，`sha256` 表达图片内容。同一张图片放在两个商品行里，应得到两条关联记录；字节只保存一次，是后面的存储决策。

遍历的核心如下，错误处理与模板校验见完整 `PictureIndex`：

```java
for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
    XSSFSheet sheet = workbook.getSheetAt(i);
    XSSFDrawing drawing = sheet.getDrawingPatriarch();
    if (drawing == null) continue;

    for (XSSFShape shape : drawing.getShapes()) {
        if (!(shape instanceof XSSFPicture picture)) continue;
        XSSFClientAnchor anchor = picture.getClientAnchor();
        if (anchor == null) {
            throw new IllegalArgumentException("picture needs a cell anchor");
        }
        int row = anchor.getRow1();
        int col = anchor.getCol1();
        // 先检查合并区域、起点列和业务编码，再计算内容哈希。
    }
}
```

这段循环只展示入口，不应单独复制成完整导入逻辑。完整示例还会拒绝分组绘图和跨数据行合并，避免把其中的图片当作普通直接子对象处理。

A 列最好在模板中明确为文本。商品编码 `00123` 一旦被 Excel 作为数字存成 `123`，程序无法凭空知道被丢掉的是几位零。示例用 `DataFormatter` 读取显示值，但它也不能恢复文件中已经不存在的信息。

## 读表、保存文件、写业务关系分成三步

解析阶段先得到业务行和图片位置索引，校验完成后再决定如何保存图片和业务记录。对中小型模板，可以在这一阶段列出「第几个工作表、第几行、哪里不符合约定」，让用户先修表。

内容哈希可以减少重复上传，但关联仍需按每个业务位置保存。上传成功、数据库写入失败时，还要能清理未引用的文件，或在重试时复用已上传对象；否则重试导入很容易留下另一批孤立文件。

这些属于业务导入流程，示例没有接对象存储或数据库。它只建立位置索引，不保证整批导入的事务性，也没有实现缺图、重复商品编码或一行多图的业务规则。要不要允许这些情况，应由产品模板先决定。

## 流式读单元格，不代表图片也流式了

POI 的 `XSSFReader` 提供事件模型，适合降低读取工作表内容的内存占用；`SXSSF` 主要用于流式写出。把对象换成 `SXSSFWorkbook`，不能把一个图片导入器变成低内存读取器。

本文示例使用 `XSSFWorkbook`，会建立工作簿对象模型；`getPictureData().getData()` 还会取得图片字节。示例适合有明确规模限制的小模板，没有做大文件压力测试，不据此给出「能导入多少万行」的承诺。

输入文件的压缩大小也不能直接当作内存上限。上线前至少需要明确上传大小、工作表与数据行数量、图片数量和单图大小的限制，并用接近最坏情况的样本观察峰值。若后续要解码或缩放图片，还要单独检查像素尺寸及解码时的资源占用。

对更大的文件，可以用事件模型处理行数据，单独处理 drawing 关系与媒体数据，按批次落盘、建立索引。这是另一条实现路径，不能把本文示例换个构造方法就当作完成了。

## 用什么样的文件检查关联关系

示例测试自己创建工作簿。其中一组写到临时目录后重新打开，验证文件里的位置与图片引用；其余用例直接检查归属规则：

- 同一份 PNG 摆在两行，保留两条商品关联，内容哈希相同。
- 图片落在横向合并区域内，归一到约定的图片列。
- 图片起点所在行没有业务编码，报错，不回退到上一行。
- 图片区域纵向跨业务行合并，报错。
- 同一图片出现在两个工作表，工作表信息仍然保留。

```bash
cd examples/backend-notes
mvn -Dtest=PictureIndexTest -Dit.test=PictureIndexIT verify
```

这里覆盖的是普通 `.xlsx`、直接挂在 drawing 下且有单元格锚点的浮动图片。旧版 `.xls`、Excel 的单元格内图片、WPS 特有图片形式、外链图片和分组对象，需要分别增加支持和样本。读不到这些图片，不能直接解释成文件没有图片。

处理这类需求时，先确定允许用户交付什么文件，再写解析代码，能省掉许多「Excel 看着正常，程序为什么读错了」的争论。

## 参考资料

- [Apache POI 图片读写示例](https://poi.apache.org/components/spreadsheet/quick-guide.html#Images)
- [XSSFPicture：图片数据与客户端锚点](https://poi.apache.org/apidocs/dev/org/apache/poi/xssf/usermodel/XSSFPicture.html)
- [XSSFClientAnchor：行列起点与偏移量](https://poi.apache.org/apidocs/dev/org/apache/poi/xssf/usermodel/XSSFClientAnchor.html)
- [Apache POI XSSF、事件模型与 SXSSF](https://poi.apache.org/components/spreadsheet/how-to.html)
