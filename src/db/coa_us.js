// US GAAP teaching chart of accounts (4-digit codes).
//   1xxx Assets · 2xxx Liabilities · 3xxx Equity · 4xxx Revenue
//   5xxx Cost of Sales · 6xxx Operating & Other Expenses
// Kept intentionally compact (a textbook chart, not an exhaustive standard).
// The export keeps the name PGC_BASICO and the { codigo, nombre } shape so the
// rest of the data layer (index.js, balances.js…) stays untouched.
export const PGC_BASICO = [
    // 1xxx — ASSETS
    // Current assets
    { codigo: '1010', nombre: 'Cash' },
    { codigo: '1020', nombre: 'Petty Cash' },
    { codigo: '1030', nombre: 'Cash Equivalents' },
    { codigo: '1100', nombre: 'Accounts Receivable' },
    { codigo: '1150', nombre: 'Allowance for Doubtful Accounts' }, // contra-asset
    { codigo: '1200', nombre: 'Notes Receivable' },
    { codigo: '1210', nombre: 'Interest Receivable' },
    { codigo: '1300', nombre: 'Merchandise Inventory' },
    { codigo: '1400', nombre: 'Supplies' },
    { codigo: '1410', nombre: 'Prepaid Insurance' },
    { codigo: '1420', nombre: 'Prepaid Rent' },
    // Non-current assets — Property, Plant & Equipment
    { codigo: '1500', nombre: 'Land' },
    { codigo: '1510', nombre: 'Buildings' },
    { codigo: '1515', nombre: 'Accumulated Depreciation — Buildings' }, // contra-asset
    { codigo: '1520', nombre: 'Equipment' },
    { codigo: '1525', nombre: 'Accumulated Depreciation — Equipment' }, // contra-asset
    { codigo: '1530', nombre: 'Vehicles' },
    { codigo: '1535', nombre: 'Accumulated Depreciation — Vehicles' }, // contra-asset
    { codigo: '1540', nombre: 'Furniture and Fixtures' },
    { codigo: '1545', nombre: 'Accumulated Depreciation — Furniture and Fixtures' }, // contra-asset
    // Non-current assets — Investments & Intangibles
    { codigo: '1600', nombre: 'Long-term Investments' },
    { codigo: '1700', nombre: 'Goodwill' },
    { codigo: '1710', nombre: 'Patents' },
    { codigo: '1720', nombre: 'Trademarks' },
    { codigo: '1750', nombre: 'Accumulated Amortization' }, // contra-asset

    // 2xxx — LIABILITIES
    // Current liabilities
    { codigo: '2010', nombre: 'Accounts Payable' },
    { codigo: '2020', nombre: 'Salaries and Wages Payable' },
    { codigo: '2030', nombre: 'Interest Payable' },
    { codigo: '2040', nombre: 'Unearned Revenue' },
    { codigo: '2050', nombre: 'Income Tax Payable' },
    { codigo: '2060', nombre: 'Dividends Payable' },
    { codigo: '2070', nombre: 'Sales Tax Payable' },
    { codigo: '2100', nombre: 'Notes Payable — Current' },
    // Long-term liabilities
    { codigo: '2500', nombre: 'Notes Payable — Long-term' },
    { codigo: '2600', nombre: 'Bonds Payable' },
    { codigo: '2650', nombre: 'Premium on Bonds Payable' },
    { codigo: '2700', nombre: 'Mortgage Payable' },
    { codigo: '2800', nombre: 'Deferred Tax Liability' },

    // 3xxx — STOCKHOLDERS' EQUITY
    { codigo: '3010', nombre: 'Common Stock' },
    { codigo: '3020', nombre: 'Preferred Stock' },
    { codigo: '3030', nombre: 'Additional Paid-in Capital' },
    { codigo: '3100', nombre: 'Retained Earnings' },
    { codigo: '3200', nombre: 'Dividends' }, // temporary, contra-equity
    { codigo: '3300', nombre: 'Treasury Stock' }, // contra-equity
    { codigo: '3900', nombre: 'Income Summary' }, // closing-only clearing account

    // 4xxx — REVENUE
    { codigo: '4010', nombre: 'Sales Revenue' },
    { codigo: '4020', nombre: 'Sales Returns and Allowances' }, // contra-revenue
    { codigo: '4030', nombre: 'Sales Discounts' }, // contra-revenue
    { codigo: '4100', nombre: 'Service Revenue' },
    { codigo: '4200', nombre: 'Interest Revenue' },
    { codigo: '4210', nombre: 'Dividend Revenue' },
    { codigo: '4300', nombre: 'Rent Revenue' },
    { codigo: '4400', nombre: 'Gain on Sale of Assets' },

    // 5xxx — COST OF SALES
    { codigo: '5010', nombre: 'Cost of Goods Sold' },
    { codigo: '5020', nombre: 'Purchases' },
    { codigo: '5030', nombre: 'Purchase Returns and Allowances' }, // contra
    { codigo: '5040', nombre: 'Purchase Discounts' }, // contra
    { codigo: '5050', nombre: 'Freight-In' },

    // 6xxx — OPERATING & OTHER EXPENSES
    { codigo: '6010', nombre: 'Salaries and Wages Expense' },
    { codigo: '6020', nombre: 'Rent Expense' },
    { codigo: '6030', nombre: 'Depreciation Expense' },
    { codigo: '6035', nombre: 'Amortization Expense' },
    { codigo: '6040', nombre: 'Insurance Expense' },
    { codigo: '6050', nombre: 'Supplies Expense' },
    { codigo: '6060', nombre: 'Utilities Expense' },
    { codigo: '6070', nombre: 'Advertising Expense' },
    { codigo: '6080', nombre: 'Repairs and Maintenance Expense' },
    { codigo: '6090', nombre: 'Office Expense' },
    { codigo: '6100', nombre: 'Bad Debt Expense' },
    { codigo: '6110', nombre: 'Delivery Expense' },
    { codigo: '6200', nombre: 'Interest Expense' },
    { codigo: '6300', nombre: 'Income Tax Expense' },
    { codigo: '6400', nombre: 'Loss on Sale of Assets' }
];
