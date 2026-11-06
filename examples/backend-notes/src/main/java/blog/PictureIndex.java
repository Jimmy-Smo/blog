package blog;

import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.openxml4j.opc.PackageAccess;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.usermodel.*;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

public final class PictureIndex {
    // 行列号保持 POI 的零基索引；展示给用户时再加 1。
    public record Ref(String sheet, int rowIndex, int columnIndex,
                      String itemCode, String sha256) {}

    public static List<Ref> read(Path path) throws Exception {
        try (var pkg = OPCPackage.open(path.toFile(), PackageAccess.READ);
             var workbook = new XSSFWorkbook(pkg)) {
            return read(workbook);
        }
    }

    public static List<Ref> read(XSSFWorkbook workbook) throws Exception {
        List<Ref> refs = new ArrayList<>();
        var formatter = new DataFormatter(Locale.ROOT);
        for (int sheetIndex = 0; sheetIndex < workbook.getNumberOfSheets(); sheetIndex++) {
            XSSFSheet sheet = workbook.getSheetAt(sheetIndex);
            var drawing = sheet.getDrawingPatriarch();
            if (drawing == null) continue;
            for (var shape : drawing.getShapes()) {
                if (shape instanceof XSSFShapeGroup) {
                    throw new IllegalArgumentException("grouped drawings are unsupported");
                }
                if (!(shape instanceof XSSFPicture picture)) continue;
                var anchor = picture.getClientAnchor();
                if (anchor == null) {
                    throw new IllegalArgumentException("picture needs a cell anchor");
                }
                int row = anchor.getRow1();
                int col = anchor.getCol1();
                for (var merged : sheet.getMergedRegions()) {
                    if (!merged.isInRange(row, col)) continue;
                    if (merged.getFirstRow() != merged.getLastRow()) {
                        throw new IllegalArgumentException("image cell must not merge business rows");
                    }
                    row = merged.getFirstRow();
                    col = merged.getFirstColumn();
                    break;
                }
                if (row < 1 || col != 1) {
                    throw new IllegalArgumentException("picture must start in a data row's image column B");
                }
                var dataRow = sheet.getRow(row);
                String itemCode = dataRow == null ? ""
                    : formatter.formatCellValue(dataRow.getCell(0)).trim();
                if (itemCode.isEmpty()) {
                    throw new IllegalArgumentException("picture has no item code at row " + (row + 1));
                }
                byte[] bytes = picture.getPictureData().getData();
                String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
                refs.add(new Ref(sheet.getSheetName(), row, col, itemCode, hash));
            }
        }
        return List.copyOf(refs);
    }
}
