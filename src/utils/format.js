// US format: thousands grouped with a comma, decimals with a dot (1,234.56).
// useGrouping 'always' also groups four-digit thousands (1,000), the usual
// convention in accounting.
const makeFormatter = (options) => {
    try {
        return new Intl.NumberFormat('en-US', { ...options, useGrouping: 'always' });
    } catch (e) {
        // Older browsers without useGrouping 'always'
        return new Intl.NumberFormat('en-US', options);
    }
};

const CURRENCY = makeFormatter({
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const NUMBER = makeFormatter({
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return CURRENCY.format(Number(amount));
};

// Like formatCurrency but without the $ symbol, for the Debit/Credit columns
export const formatNumber = (amount) => {
    if (amount === undefined || amount === null || amount === '') return '-';
    return NUMBER.format(Number(amount));
};
