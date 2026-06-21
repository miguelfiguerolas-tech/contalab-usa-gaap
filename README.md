# ContaLab

**Accounting for students** — a Chrome extension to learn and practice accounting under **US GAAP**: Journal, General Ledger, Trial Balance, Balance Sheet, Income Statement, and a Review panel that catches the typical classroom mistakes.

Designed for accounting courses: data lives in the browser (IndexedDB, no servers or accounts), students hand in their work as a JSON file, and the instructor imports it and grades it from the Review tab.

## Features

- **Journal**: entries with balance validation, search, and PDF export.
- **General Ledger**: account statement with running balance or a classic **T-account** view, exportable to PDF.
- **Chart of Accounts**: a preloaded US GAAP teaching chart (4-digit codes), custom sub-accounts, group filters (1-6).
- **Financial Statements**: Trial Balance, Balance Sheet, and Income Statement, with PDF and CSV export.
- **Review**: automatic checks (out-of-balance journal, accounting equation, negative cash, unnatural balances, revenue/expense sign, missing depreciation, missing cost of goods sold) with direct links to the accounts to review.
- **Closing assistant**: generates the real closing entries (revenues/expenses → Income Summary → Retained Earnings, and Dividends → Retained Earnings).
- **Submissions**: JSON export/import with a content fingerprint and submission card, to grade and to spot direct copies.

## Account model (US GAAP)

The default chart uses 4-digit codes:

- `1xxx` Assets · `2xxx` Liabilities · `3xxx` Equity
- `4xxx` Revenue · `5xxx` Cost of Sales · `6xxx` Operating & Other Expenses

Key special accounts: **3100 Retained Earnings**, **3200 Dividends**, **3900 Income Summary**.

## Development

Requirements: Node.js 18+.

```bash
npm install
npm run dev      # development server
npm test         # tests (Vitest) for the accounting logic
npm run build    # generates dist/
```

To load the extension in Chrome: `chrome://extensions` → enable "Developer mode" → "Load unpacked" → select the `dist/` folder.

### Structure

- `src/db/` — accounting logic and persistence (IndexedDB via [idb](https://github.com/jakearchibald/idb)): chart of accounts (`coa_us.js`), account classification (`accountTypes.js`), statement structures (`statements_us.js`), entries, balances, closing, backups.
- `src/dashboard/` — React interface.
- `src/utils/` — en-US/USD formatting, PDF export (jsPDF), links.
- `public/` — extension manifest and service worker.

The accounting logic (balances, income statement, closing) is in pure functions with tests in `src/db/*.test.js`.

## License

[MIT](LICENSE) — © Miguel Figuerola. Use it, modify it, and share it freely.
