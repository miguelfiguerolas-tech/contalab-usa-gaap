import { describe, it, expect } from 'vitest';
import { buildApuntesRegularizacion, buildApuntesCierre } from './cierre';
import { buildSumasYSaldos } from './balances';

const cuenta = (codigo) => ({ codigo, nombre: `Account ${codigo}` });
const apunte = (cuenta_codigo, debe = 0, haber = 0) => ({ cuenta_codigo, debe, haber });

const sumas = (...movs) => {
    const cuentas = [...new Set(movs.map(m => m[0]))].map(c => cuenta(c));
    const apuntes = movs.map(([c, d, h]) => apunte(c, d, h));
    return buildSumasYSaldos(cuentas, apuntes);
};

const cuadre = (apuntes) => {
    const debe = apuntes.reduce((s, a) => s + a.debe, 0);
    const haber = apuntes.reduce((s, a) => s + a.haber, 0);
    return Math.abs(debe - haber);
};

// STEP 1 — close revenues and expenses to Income Summary (3900) ----------

describe('buildApuntesRegularizacion (close to Income Summary)', () => {
    it('closes revenues and expenses to Income Summary, profit on the credit side', () => {
        const result = buildApuntesRegularizacion(sumas(
            ['6010', 2000, 0],   // expense
            ['4010', 0, 3000],   // revenue
            ['1010', 1000, 0]    // asset, must be left alone
        ));

        expect(result.resultado).toBe(1000); // net income

        const linea6010 = result.apuntes.find(a => a.cuenta_codigo === '6010');
        const linea4010 = result.apuntes.find(a => a.cuenta_codigo === '4010');
        const lineaIS = result.apuntes.find(a => a.cuenta_codigo === '3900');

        expect(linea6010).toMatchObject({ debe: 0, haber: 2000 }); // expense closed with a credit
        expect(linea4010).toMatchObject({ debe: 3000, haber: 0 }); // revenue closed with a debit
        expect(lineaIS).toMatchObject({ debe: 0, haber: 1000 });   // profit credited to Income Summary

        expect(result.apuntes.some(a => a.cuenta_codigo === '1010')).toBe(false);
        expect(cuadre(result.apuntes)).toBeLessThan(0.01);
    });

    it('debits Income Summary on a loss', () => {
        const result = buildApuntesRegularizacion(sumas(['6010', 500, 0]));
        const lineaIS = result.apuntes.find(a => a.cuenta_codigo === '3900');

        expect(result.resultado).toBe(-500);
        expect(lineaIS).toMatchObject({ debe: 500, haber: 0 });
        expect(cuadre(result.apuntes)).toBeLessThan(0.01);
    });

    it('returns null when there is nothing to close', () => {
        expect(buildApuntesRegularizacion(sumas(['1010', 100, 0]))).toBeNull();
    });
});

// STEP 2 — close Income Summary and Dividends to Retained Earnings -------

describe('buildApuntesCierre (close to Retained Earnings)', () => {
    it('refuses to close while revenue/expense accounts are still open', () => {
        const result = buildApuntesCierre(sumas(['4010', 0, 500], ['1010', 500, 0]));
        expect(result.error).toBeTruthy();
    });

    it('closes Income Summary and Dividends to Retained Earnings and balances', () => {
        const result = buildApuntesCierre(sumas(
            ['3900', 0, 1000],   // Income Summary with a credit (profit) balance
            ['3200', 200, 0]     // Dividends
        ));

        const lineaIS = result.apuntes.find(a => a.cuenta_codigo === '3900');
        const lineaDiv = result.apuntes.find(a => a.cuenta_codigo === '3200');
        const lineaRE = result.apuntes.find(a => a.cuenta_codigo === '3100');

        expect(lineaIS).toMatchObject({ debe: 1000, haber: 0 });  // close the credit balance
        expect(lineaDiv).toMatchObject({ debe: 0, haber: 200 });  // close the dividends debit
        expect(lineaRE).toMatchObject({ debe: 0, haber: 800 });   // RE up by 1000 profit - 200 dividends
        expect(cuadre(result.apuntes)).toBeLessThan(0.01);
    });

    it('returns null when Income Summary and Dividends are already zero', () => {
        expect(buildApuntesCierre(sumas(['1010', 100, 100]))).toBeNull();
    });
});
