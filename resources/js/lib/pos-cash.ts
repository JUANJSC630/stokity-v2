/** Denominations of Colombian bills and the coins that make sense as a "rounded" tender. */
const DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

/** What is shown when there is nothing to round up yet. */
const DEFAULT_BILLS = [10000, 20000, 50000, 100000];

/**
 * Suggested amounts the customer may hand over: the total rounded up to each denomination, unique, ascending and at most six.
 * With no total yet it falls back to the usual bills.
 */
export function suggestBills(total: number): number[] {
    const suggestions: number[] = [];

    if (total > 0) {
        for (const denomination of DENOMINATIONS) {
            const rounded = Math.ceil(total / denomination) * denomination;
            if (rounded >= total && !suggestions.includes(rounded)) {
                suggestions.push(rounded);
            }
        }
        suggestions.sort((a, b) => a - b);
        suggestions.splice(6);
    }

    return suggestions.length > 0 ? suggestions : DEFAULT_BILLS;
}
