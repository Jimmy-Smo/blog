package blog;

import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.*;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;

class PictureIndexIT {
    @TempDir Path temp;

    private byte[] png() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", output);
        return output.toByteArray();
    }

    private void add(XSSFWorkbook wb, XSSFSheet sheet, int picture, int row, int col) {
        var anchor = new XSSFClientAnchor();
        anchor.setRow1(row); anchor.setCol1(col);
        anchor.setRow2(row + 1); anchor.setCol2(col + 1);
        sheet.createDrawingPatriarch().createPicture(anchor, picture);
    }

    @Test void keepsPlacementEvenWhenImageBytesAreShared() throws Exception {
        Path file = temp.resolve("sample.xlsx");
        try (var wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("products");
            sheet.createRow(0).createCell(0).setCellValue("itemCode");
            sheet.createRow(1).createCell(0).setCellValue("SKU-A");
            sheet.createRow(2).createCell(0).setCellValue("SKU-B");
            sheet.addMergedRegion(new CellRangeAddress(2, 2, 1, 2));
            int picture = wb.addPicture(png(), Workbook.PICTURE_TYPE_PNG);
            add(wb, sheet, picture, 1, 1);
            add(wb, sheet, picture, 2, 2);
            try (var output = Files.newOutputStream(file)) { wb.write(output); }
        }
        var refs = PictureIndex.read(file);
        assertEquals(2, refs.size());
        assertEquals("SKU-A", refs.get(0).itemCode());
        assertEquals("SKU-B", refs.get(1).itemCode());
        assertEquals(1, refs.get(1).columnIndex());
        assertEquals(2, refs.get(1).rowIndex());
        assertEquals(refs.get(0).sha256(), refs.get(1).sha256());
    }

}
