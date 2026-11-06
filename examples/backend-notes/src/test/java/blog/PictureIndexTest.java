package blog;

import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.junit.jupiter.api.Test;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;

class PictureIndexTest {
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

    @Test void doesNotAssignPictureFromBlankRowToPreviousItem() throws Exception {
        try (var wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet();
            sheet.createRow(1).createCell(0).setCellValue("SKU-A");
            add(wb, sheet, wb.addPicture(png(), Workbook.PICTURE_TYPE_PNG), 2, 1);
            assertThrows(IllegalArgumentException.class, () -> PictureIndex.read(wb));
        }
    }

    @Test void rejectsMergeAcrossBusinessRows() throws Exception {
        try (var wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet();
            sheet.createRow(1).createCell(0).setCellValue("SKU-A");
            sheet.addMergedRegion(new CellRangeAddress(1, 2, 1, 1));
            add(wb, sheet, wb.addPicture(png(), Workbook.PICTURE_TYPE_PNG), 1, 1);
            assertThrows(IllegalArgumentException.class, () -> PictureIndex.read(wb));
        }
    }

    @Test void preservesSheetInPictureIdentity() throws Exception {
        try (var wb = new XSSFWorkbook()) {
            int picture = wb.addPicture(png(), Workbook.PICTURE_TYPE_PNG);
            for (String name : new String[]{"one", "two"}) {
                var sheet = wb.createSheet(name);
                sheet.createRow(1).createCell(0).setCellValue("SKU-A");
                add(wb, sheet, picture, 1, 1);
            }
            var refs = PictureIndex.read(wb);
            assertNotEquals(refs.get(0).sheet(), refs.get(1).sheet());
            assertEquals(refs.get(0).sha256(), refs.get(1).sha256());
        }
    }
}
