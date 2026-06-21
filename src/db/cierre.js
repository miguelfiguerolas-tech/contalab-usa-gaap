import { createAsiento, getCuentas } from './index';
import { getSumasYSaldos } from './balances';
import {
    isRevenue,
    isExpense,
    INCOME_SUMMARY,
    RETAINED_EARNINGS,
    DIVIDENDS
} from './accountTypes';

// Threshold to ignore rounding leftovers.
const EPSILON = 0.005;

// Descriptions used for the two closing journal entries (the audit detects a
// closing entry by the word "closing", so keep it in the text).
export const CLOSING_STEP1_DESC = 'Closing entry — revenues and expenses to Income Summary';
export const CLOSING_STEP2_DESC = 'Closing entry — Income Summary and Dividends to Retained Earnings';

// Pure logic — STEP 1: close every revenue and expense account to Income Summary.
// Revenues carry a credit balance (debit them); expenses carry a debit balance
// (credit them); Income Summary takes the difference (credit on a profit, debit
// on a loss).
export const buildApuntesRegularizacion = (sumas) => {
    const temporales = sumas.filter(c =>
        (isRevenue(c.codigo) || isExpense(c.codigo)) &&
        Math.abs(c.saldoNeto) > EPSILON
    );

    if (temporales.length === 0) return null;

    const apuntes = [];
    let resultado = 0; // revenue - expenses = net income

    temporales.forEach(c => {
        if (c.saldoNeto > 0) {
            // expense (debit balance) -> credit it to zero it out
            apuntes.push({ cuenta_codigo: c.codigo, debe: 0, haber: c.saldoNeto });
        } else {
            // revenue (credit balance) -> debit it to zero it out
            apuntes.push({ cuenta_codigo: c.codigo, debe: -c.saldoNeto, haber: 0 });
        }
        resultado -= c.saldoNeto;
    });

    if (Math.abs(resultado) > EPSILON) {
        apuntes.push(resultado > 0
            ? { cuenta_codigo: INCOME_SUMMARY, debe: 0, haber: resultado }   // profit -> credit Income Summary
            : { cuenta_codigo: INCOME_SUMMARY, debe: -resultado, haber: 0 }); // loss -> debit Income Summary
    }

    return { apuntes, resultado };
};

// Pure logic — STEP 2: close Income Summary and Dividends to Retained Earnings.
// Revenue/expense accounts must already be closed (step 1). Retained Earnings
// absorbs the net (increases on a profit, decreases by the dividends declared).
export const buildApuntesCierre = (sumas) => {
    const pendientes = sumas.filter(c =>
        (isRevenue(c.codigo) || isExpense(c.codigo)) &&
        Math.abs(c.saldoNeto) > EPSILON
    );
    if (pendientes.length > 0) {
        return { error: 'Revenue and expense accounts are still open. Post the Income Summary closing entry first.' };
    }

    const aCerrar = sumas.filter(c =>
        (c.codigo === INCOME_SUMMARY || c.codigo === DIVIDENDS) &&
        Math.abs(c.saldoNeto) > EPSILON
    );
    if (aCerrar.length === 0) return null;

    const apuntes = [];
    let reNeto = 0; // net saldoNeto moved onto Retained Earnings

    aCerrar.forEach(c => {
        if (c.saldoNeto > 0) {
            apuntes.push({ cuenta_codigo: c.codigo, debe: 0, haber: c.saldoNeto });
        } else {
            apuntes.push({ cuenta_codigo: c.codigo, debe: -c.saldoNeto, haber: 0 });
        }
        reNeto += c.saldoNeto;
    });

    if (Math.abs(reNeto) > EPSILON) {
        apuntes.push(reNeto > 0
            ? { cuenta_codigo: RETAINED_EARNINGS, debe: reNeto, haber: 0 }
            : { cuenta_codigo: RETAINED_EARNINGS, debe: 0, haber: -reNeto });
    }

    return { apuntes };
};

export const crearAsientoRegularizacion = async (ejercicioId, anyo) => {
    const sumas = await getSumasYSaldos(ejercicioId);
    const construido = buildApuntesRegularizacion(sumas);

    if (!construido) {
        throw new Error('There are no open revenue or expense accounts to close.');
    }

    // Income Summary must exist in the chart (it ships with the default chart).
    const cuentas = await getCuentas(ejercicioId);
    if (!cuentas.some(c => c.codigo === INCOME_SUMMARY)) {
        throw new Error(`The Income Summary account (${INCOME_SUMMARY}) is missing. Add it in the Chart of Accounts.`);
    }

    const fecha = `${anyo}-12-31`;
    await createAsiento(ejercicioId, fecha, CLOSING_STEP1_DESC, construido.apuntes);
    return construido.resultado;
};

export const crearAsientoCierre = async (ejercicioId, anyo) => {
    const sumas = await getSumasYSaldos(ejercicioId);
    const construido = buildApuntesCierre(sumas);

    if (!construido) {
        throw new Error('Nothing left to close to Retained Earnings.');
    }
    if (construido.error) {
        throw new Error(construido.error);
    }

    // Retained Earnings must exist in the chart.
    const cuentas = await getCuentas(ejercicioId);
    if (!cuentas.some(c => c.codigo === RETAINED_EARNINGS)) {
        throw new Error(`The Retained Earnings account (${RETAINED_EARNINGS}) is missing. Add it in the Chart of Accounts.`);
    }

    const fecha = `${anyo}-12-31`;
    return createAsiento(ejercicioId, fecha, CLOSING_STEP2_DESC, construido.apuntes);
};
