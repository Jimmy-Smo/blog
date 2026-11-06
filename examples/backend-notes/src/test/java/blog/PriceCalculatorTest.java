package blog;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PriceCalculatorTest {
    private final PriceCalculator calculator = new PriceCalculator();

    @Test void emptyCartCostsZero() {
        assertEquals(0, calculator.total(1999, 0));
    }

    @Test void totalsIntegerMinorUnits() {
        assertEquals(5997, calculator.total(1999, 3));
    }

    @Test void rejectsNegativeQuantity() {
        assertThrows(IllegalArgumentException.class, () -> calculator.total(1999, -1));
    }

    @Test void rejectsNegativePrice() {
        assertThrows(IllegalArgumentException.class, () -> calculator.total(-1, 1));
    }

    @Test void reportsOverflowInsteadOfWrapping() {
        assertThrows(ArithmeticException.class, () -> calculator.total(Long.MAX_VALUE, 2));
    }
}
