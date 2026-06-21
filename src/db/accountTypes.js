// Single source of truth for classifying accounts by their code range and for
// the special accounts used when closing the books. Replaces the scattered
// `codigo.startsWith('6'/'7')` checks and the hard-coded result account.
//
//   1xxx Assets · 2xxx Liabilities · 3xxx Equity
//   4xxx Revenue · 5xxx Cost of Sales · 6xxx Operating & Other Expenses

// Special accounts (must exist in the chart — see coa_us.js)
export const RETAINED_EARNINGS = '3100';
export const DIVIDENDS = '3200';
export const INCOME_SUMMARY = '3900';

export const isAsset = (codigo) => codigo.startsWith('1');
export const isLiability = (codigo) => codigo.startsWith('2');
export const isEquity = (codigo) => codigo.startsWith('3');
export const isRevenue = (codigo) => codigo.startsWith('4');
// Cost of sales (5xxx) and operating/other expenses (6xxx) are both expenses.
export const isExpense = (codigo) => codigo.startsWith('5') || codigo.startsWith('6');

// Temporary accounts get closed out at period end: revenues, expenses and the
// Dividends account.
export const isTemporary = (codigo) =>
    isRevenue(codigo) || isExpense(codigo) || codigo === DIVIDENDS;

// Cash and cash equivalents (1010 Cash, 1020 Petty Cash, 1030 Cash Equivalents).
export const isCash = (codigo) => codigo.startsWith('10');
