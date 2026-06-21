import { describe, it, expect } from 'vitest';
import {
    buildSumasYSaldos,
    computeBalanceSituacion,
    computeCuentaResultados
} from './balances';
import { BALANCE_STRUCTURE, PYG_STRUCTURE } from './statements_us';

// Helpers ---------------------------------------------------------------

const cuenta = (codigo, nombre = `Account ${codigo}`) => ({ codigo, nombre });

const apunte = (cuenta_codigo, debe = 0, haber = 0) => ({ cuenta_codigo, debe, haber });

// Builds a trial balance from [codigo, debit, credit] tuples.
const sumas = (...movs) => {
    const cuentas = [...new Set(movs.map(m => m[0]))].map(c => cuenta(c));
    const apuntes = movs.map(([c, d, h]) => apunte(c, d, h));
    return buildSumasYSaldos(cuentas, apuntes);
};

const findNode = (nodes, id) => {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
        }
    }
    return null;
};

const totalActivo = (balance) => balance.activo.reduce((s, n) => s + n.amount, 0);
const totalPasivo = (balance) => balance.patrimonioPasivo.reduce((s, n) => s + n.amount, 0);

// buildSumasYSaldos -----------------------------------------------------

describe('buildSumasYSaldos (trial balance)', () => {
    it('accumulates debits and credits per account and computes the balance', () => {
        const result = sumas(['1100', 1000, 0], ['1100', 500, 0], ['1100', 0, 300]);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            codigo: '1100',
            sumaDebe: 1500,
            sumaHaber: 300,
            saldoDeudor: 1200,
            saldoAcreedor: 0,
            saldoNeto: 1200
        });
    });

    it('excludes accounts with no activity', () => {
        const result = buildSumasYSaldos([cuenta('3010'), cuenta('1100')], [apunte('1100', 100)]);
        expect(result.map(r => r.codigo)).toEqual(['1100']);
    });
});

// Balance Sheet ---------------------------------------------------------

describe('computeBalanceSituacion (balance sheet)', () => {
    it('nets accumulated depreciation against PP&E (1515 vs 1510)', () => {
        const balance = computeBalanceSituacion(sumas(
            ['1510', 5000, 0],   // Buildings
            ['1515', 0, 1000],   // Accumulated Depreciation — Buildings (contra)
            ['3010', 0, 4000]    // Common Stock
        ));

        const ppe = findNode(balance.activo, 'A_NC_I');
        expect(ppe.amount).toBe(4000); // 5000 - 1000, counted once
        expect(totalActivo(balance)).toBe(4000);
    });

    it('nets the allowance for doubtful accounts against receivables (1150 vs 1100)', () => {
        const balance = computeBalanceSituacion(sumas(
            ['1100', 5000, 0],   // Accounts Receivable
            ['1150', 0, 200],    // Allowance for Doubtful Accounts (contra)
            ['3010', 0, 4800]
        ));

        const receivables = findNode(balance.activo, 'A_C_II');
        expect(receivables.amount).toBe(4800);
    });

    it('balances Assets = Liabilities + Equity in a complete case with a profit', () => {
        const balance = computeBalanceSituacion(sumas(
            ['3010', 0, 10000],  // Common Stock
            ['1010', 10000, 0],  // Cash
            ['5020', 2000, 0],   // Purchases (expense)
            ['2010', 0, 2000],   // Accounts Payable
            ['1100', 3000, 0],   // Accounts Receivable
            ['4010', 0, 3000]    // Sales Revenue
        ));

        expect(totalActivo(balance)).toBe(13000);
        expect(totalPasivo(balance)).toBe(13000);

        // Net income (3000 - 2000) is folded into Retained Earnings within equity.
        const re = findNode(balance.patrimonioPasivo, 'EQ_IV');
        expect(re.amount).toBe(1000);
    });

    it('shows a loss as negative Retained Earnings within equity', () => {
        const balance = computeBalanceSituacion(sumas(
            ['3010', 0, 5000],
            ['1010', 4000, 0],
            ['5020', 1000, 0]
        ));

        const re = findNode(balance.patrimonioPasivo, 'EQ_IV');
        expect(re.amount).toBe(-1000);
        expect(totalActivo(balance)).toBe(totalPasivo(balance));
    });

    it('does not mutate the trial balance it receives', () => {
        const lista = sumas(['4010', 0, 1000], ['3100', 0, 50]);
        const copia = JSON.parse(JSON.stringify(lista));
        computeBalanceSituacion(lista);
        expect(lista).toEqual(copia);
    });
});

// Income Statement ------------------------------------------------------

describe('computeCuentaResultados (income statement)', () => {
    const rowAmount = (pyg, id) => pyg.find(r => r.id === id).amount;

    it('computes net sales, cost of goods sold and net income', () => {
        const pyg = computeCuentaResultados(sumas(['4010', 0, 3000], ['5010', 2000, 0]));

        expect(rowAmount(pyg, '1')).toBe(3000);
        expect(rowAmount(pyg, '3')).toBe(-2000);
        expect(rowAmount(pyg, 'GROSS_PROFIT')).toBe(1000);
        expect(rowAmount(pyg, 'NET_INCOME')).toBe(1000);
    });

    it('puts income tax (6300) only on line 15, not in operating expenses', () => {
        const pyg = computeCuentaResultados(sumas(['6300', 250, 0]));

        expect(rowAmount(pyg, '15')).toBe(-250);
        expect(rowAmount(pyg, '10')).toBe(0); // not double-counted in Other Operating Expenses
        expect(rowAmount(pyg, 'NET_INCOME')).toBe(-250);
    });

    it('keeps interest expense (6200) out of operating income', () => {
        const pyg = computeCuentaResultados(sumas(['6200', 100, 0]));

        expect(rowAmount(pyg, '13')).toBe(-100);
        expect(rowAmount(pyg, 'OPERATING_INCOME')).toBe(0);
        expect(rowAmount(pyg, 'NET_INCOME')).toBe(-100);
    });
});

// Structure sanity ------------------------------------------------------

describe('statement structure', () => {
    const collectLeaves = (nodes, leaves = []) => {
        nodes.forEach(node => {
            if (node.children) collectLeaves(node.children, leaves);
            else if (node.accounts) leaves.push(node);
        });
        return leaves;
    };

    it('no account prefix appears in two balance sheet lines', () => {
        const leaves = collectLeaves([
            ...BALANCE_STRUCTURE.activo,
            ...BALANCE_STRUCTURE.patrimonio_pasivo
        ]);

        const seen = new Map(); // prefix -> leaf id
        const duplicados = [];
        leaves.forEach(leaf => {
            leaf.accounts.forEach(prefix => {
                if (seen.has(prefix)) {
                    duplicados.push(`${prefix} in ${seen.get(prefix)} and ${leaf.id}`);
                } else {
                    seen.set(prefix, leaf.id);
                }
            });
        });

        expect(duplicados).toEqual([]);
    });

    it('no account prefix appears in two income statement lines', () => {
        const seen = new Map();
        const duplicados = [];
        PYG_STRUCTURE.filter(r => !r.isTotal).forEach(row => {
            row.accounts.forEach(prefix => {
                if (seen.has(prefix)) {
                    duplicados.push(`${prefix} in ${seen.get(prefix)} and ${row.id}`);
                } else {
                    seen.set(prefix, row.id);
                }
            });
        });

        expect(duplicados).toEqual([]);
    });
});
