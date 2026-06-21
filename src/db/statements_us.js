// Presentation structure for the Balance Sheet and the (multi-step) Income
// Statement under US GAAP. Leaves carry `accounts` = code prefixes; the longest
// matching prefix wins (see assignAccountsToLeaves in balances.js), so a 4-digit
// prefix like '6200' beats a 2-digit '60'.

// Account groups, for navigation filters (first digit of the code).
export const ACCOUNT_GROUPS = {
    '1': 'Assets',
    '2': 'Liabilities',
    '3': 'Equity',
    '4': 'Revenue',
    '5': 'Cost of Sales',
    '6': 'Operating & Other Expenses'
};

export const BALANCE_STRUCTURE = {
    activo: [
        {
            id: 'A_C',
            label: 'A) CURRENT ASSETS',
            children: [
                {
                    id: 'A_C_I',
                    label: 'I. Cash and Cash Equivalents',
                    accounts: ['10'] // 1010 / 1020 / 1030
                },
                {
                    id: 'A_C_II',
                    label: 'II. Accounts Receivable (net)',
                    accounts: ['1100', '1150'] // receivable + allowance (contra)
                },
                {
                    id: 'A_C_III',
                    label: 'III. Notes and Interest Receivable',
                    accounts: ['1200', '1210']
                },
                {
                    id: 'A_C_IV',
                    label: 'IV. Merchandise Inventory',
                    accounts: ['1300']
                },
                {
                    id: 'A_C_V',
                    label: 'V. Prepaid Expenses and Supplies',
                    accounts: ['1400', '1410', '1420']
                }
            ]
        },
        {
            id: 'A_NC',
            label: 'B) NON-CURRENT ASSETS',
            children: [
                {
                    id: 'A_NC_I',
                    label: 'I. Property, Plant and Equipment (net)',
                    accounts: ['15'] // land, buildings, equipment… and their accumulated depreciation
                },
                {
                    id: 'A_NC_II',
                    label: 'II. Long-term Investments',
                    accounts: ['16']
                },
                {
                    id: 'A_NC_III',
                    label: 'III. Intangible Assets (net)',
                    accounts: ['17'] // goodwill, patents, trademarks + accumulated amortization
                }
            ]
        }
    ],
    patrimonio_pasivo: [
        {
            id: 'P_C',
            label: 'A) CURRENT LIABILITIES',
            children: [
                { id: 'P_C_I', label: 'I. Accounts Payable', accounts: ['2010'] },
                { id: 'P_C_II', label: 'II. Accrued Liabilities', accounts: ['2020', '2030'] },
                { id: 'P_C_III', label: 'III. Unearned Revenue', accounts: ['2040'] },
                { id: 'P_C_IV', label: 'IV. Income Tax Payable', accounts: ['2050'] },
                { id: 'P_C_V', label: 'V. Other Current Liabilities', accounts: ['2060', '2070'] },
                { id: 'P_C_VI', label: 'VI. Notes Payable — Current', accounts: ['2100'] }
            ]
        },
        {
            id: 'P_NC',
            label: 'B) LONG-TERM LIABILITIES',
            children: [
                { id: 'P_NC_I', label: 'I. Notes Payable — Long-term', accounts: ['2500'] },
                { id: 'P_NC_II', label: 'II. Bonds Payable', accounts: ['2600', '2650'] },
                { id: 'P_NC_III', label: 'III. Mortgage Payable', accounts: ['2700'] },
                { id: 'P_NC_IV', label: 'IV. Deferred Tax Liability', accounts: ['2800'] }
            ]
        },
        {
            id: 'EQ',
            label: "C) STOCKHOLDERS' EQUITY",
            children: [
                { id: 'EQ_I', label: 'I. Common Stock', accounts: ['3010'] },
                { id: 'EQ_II', label: 'II. Preferred Stock', accounts: ['3020'] },
                { id: 'EQ_III', label: 'III. Additional Paid-in Capital', accounts: ['3030'] },
                { id: 'EQ_IV', label: 'IV. Retained Earnings', accounts: ['3100'] },
                { id: 'EQ_V', label: 'V. (Dividends)', accounts: ['3200'] },
                { id: 'EQ_VI', label: 'VI. (Treasury Stock)', accounts: ['3300'] }
            ]
        }
    ]
};

export const PYG_STRUCTURE = [
    {
        id: '1',
        label: '1. Net Sales',
        accounts: ['40'], // sales + returns + discounts (contra)
        sign: 1
    },
    {
        id: '2',
        label: '2. Service Revenue',
        accounts: ['41'],
        sign: 1
    },
    {
        id: '3',
        label: '3. Cost of Goods Sold',
        accounts: ['50'], // purchases, returns/discounts (contra), freight-in
        sign: -1
    },
    {
        id: 'GROSS_PROFIT',
        label: 'GROSS PROFIT',
        isTotal: true,
        sumIds: ['1', '2', '3']
    },
    { id: '4', label: '4. Salaries and Wages Expense', accounts: ['6010'], sign: -1 },
    { id: '5', label: '5. Rent Expense', accounts: ['6020'], sign: -1 },
    { id: '6', label: '6. Depreciation and Amortization Expense', accounts: ['6030', '6035'], sign: -1 },
    { id: '7', label: '7. Insurance Expense', accounts: ['6040'], sign: -1 },
    { id: '8', label: '8. Utilities Expense', accounts: ['6060'], sign: -1 },
    { id: '9', label: '9. Advertising Expense', accounts: ['6070'], sign: -1 },
    {
        id: '10',
        label: '10. Other Operating Expenses',
        accounts: ['6050', '6080', '6090', '6100', '6110'],
        sign: -1
    },
    {
        id: 'TOTAL_OPEX',
        label: 'Total Operating Expenses',
        isTotal: true,
        sumIds: ['4', '5', '6', '7', '8', '9', '10']
    },
    {
        id: 'OPERATING_INCOME',
        label: 'A) OPERATING INCOME',
        isTotal: true,
        sumIds: ['GROSS_PROFIT', 'TOTAL_OPEX']
    },
    {
        id: '11',
        label: '11. Interest Revenue',
        accounts: ['4200'],
        sign: 1
    },
    {
        id: '12',
        label: '12. Other Revenue and Gains',
        accounts: ['4210', '4300', '4400'],
        sign: 1
    },
    {
        id: '13',
        label: '13. Interest Expense',
        accounts: ['6200'],
        sign: -1
    },
    {
        id: '14',
        label: '14. Other Expenses and Losses',
        accounts: ['6400'],
        sign: -1
    },
    {
        id: 'TOTAL_OTHER',
        label: 'B) NON-OPERATING INCOME / (EXPENSE)',
        isTotal: true,
        sumIds: ['11', '12', '13', '14']
    },
    {
        id: 'INCOME_BEFORE_TAX',
        label: 'C) INCOME BEFORE INCOME TAX',
        isTotal: true,
        sumIds: ['OPERATING_INCOME', 'TOTAL_OTHER']
    },
    {
        id: '15',
        label: '15. Income Tax Expense',
        accounts: ['6300'],
        sign: -1
    },
    {
        id: 'NET_INCOME',
        label: 'D) NET INCOME',
        isTotal: true,
        sumIds: ['INCOME_BEFORE_TAX', '15']
    }
];
