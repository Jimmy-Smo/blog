package blog;

public final class PriceCalculator {
    public long total(long unitPrice, int quantity) {
        if (unitPrice < 0 || quantity < 0) {
            throw new IllegalArgumentException("price and quantity must be nonnegative");
        }
        return Math.multiplyExact(unitPrice, (long) quantity);
    }
}
