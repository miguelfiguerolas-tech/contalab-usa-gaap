import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll } from 'vitest';
import { createEjercicio, createAsiento, getAsientos, getCuentas, getEjercicios } from './index';
import { exportEjercicio, importEjercicio } from './backup';

// exportEjercicio usa localStorage (id anónimo de instalación); en el entorno
// node de vitest no existe, así que lo simulamos.
beforeAll(() => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k)
    };
});

describe('export/import round-trip', () => {
    it('reimports a period with identical accounts, entries and lines', async () => {
        const id = await createEjercicio('RoundTrip Co', 2026);
        await createAsiento(id, '2026-03-15', 'Owner investment', [
            { cuenta_codigo: '1010', debe: 1000, haber: 0 },
            { cuenta_codigo: '3010', debe: 0, haber: 1000 }
        ]);
        await createAsiento(id, '2026-04-01', 'Cash sale', [
            { cuenta_codigo: '1010', debe: 250.5, haber: 0 },
            { cuenta_codigo: '4010', debe: 0, haber: 250.5 }
        ]);

        const json = await exportEjercicio(id);
        const newId = await importEjercicio(json);
        expect(newId).not.toBe(id);

        const ejercicios = await getEjercicios();
        const imported = ejercicios.find(e => e.id === newId);
        expect(imported.nombre).toBe('RoundTrip Co (Imported)');
        expect(imported.entrega.huella).toHaveLength(16);

        const [cuentasOrig, cuentasImp] = await Promise.all([getCuentas(id), getCuentas(newId)]);
        expect(cuentasImp.map(c => c.codigo).sort()).toEqual(cuentasOrig.map(c => c.codigo).sort());

        const [asientosOrig, asientosImp] = await Promise.all([getAsientos(id), getAsientos(newId)]);
        const strip = (asientos) => asientos.map(a => ({
            fecha: a.fecha,
            concepto: a.concepto,
            numero: a.numero,
            apuntes: a.apuntes.map(ap => ({ cuenta_codigo: ap.cuenta_codigo, debe: ap.debe, haber: ap.haber }))
        }));
        expect(strip(asientosImp)).toEqual(strip(asientosOrig));
    });

    it('produces the same content fingerprint when re-exported', async () => {
        const id = await createEjercicio('Huella Co', 2026);
        await createAsiento(id, '2026-05-01', 'Sale', [
            { cuenta_codigo: '1010', debe: 100, haber: 0 },
            { cuenta_codigo: '4010', debe: 0, haber: 100 }
        ]);
        const first = JSON.parse(await exportEjercicio(id));
        const newId = await importEjercicio(JSON.stringify(first));
        const second = JSON.parse(await exportEjercicio(newId));
        expect(second.meta.huella).toBe(first.meta.huella);
    });
});

describe('import validation', () => {
    it('rejects a file that is not JSON', async () => {
        await expect(importEjercicio('not json at all')).rejects.toThrow('not valid JSON');
    });

    it('rejects a JSON without the data section', async () => {
        await expect(importEjercicio('{"foo": 1}')).rejects.toThrow('missing "data" section');
    });

    it('rejects a backup without period info', async () => {
        await expect(importEjercicio(JSON.stringify({ data: { cuentas: [], asientos: [], apuntes: [] } })))
            .rejects.toThrow('missing period information');
    });

    it('rejects a backup with malformed lists', async () => {
        await expect(importEjercicio(JSON.stringify({ data: { ejercicio: { nombre: 'X' }, cuentas: {}, asientos: [], apuntes: [] } })))
            .rejects.toThrow('malformed');
    });

    it('rejects newer export versions', async () => {
        await expect(importEjercicio(JSON.stringify({ version: 2, data: {} })))
            .rejects.toThrow('newer version');
    });

    it('rejects an entry line without account code', async () => {
        const backup = {
            version: 1,
            data: { ejercicio: { nombre: 'X', anyo: 2026 }, cuentas: [], asientos: [], apuntes: [{ asiento_id: 1 }] }
        };
        await expect(importEjercicio(JSON.stringify(backup))).rejects.toThrow('entry line');
    });
});
