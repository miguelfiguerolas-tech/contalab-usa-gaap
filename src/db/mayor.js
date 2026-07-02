import { initDB } from './index';

export const getMayor = async (ejercicioId, cuentaCodigo) => {
    const db = await initDB();

    // 1. Apuntes de esa cuenta en ese ejercicio, directos del índice compuesto
    // ['ejercicio_id', 'cuenta_codigo'] definido en initDB.
    const apuntesCuenta = await db.getAllFromIndex(
        'apuntes',
        'ejercicio_cuenta',
        [ejercicioId, cuentaCodigo]
    );

    // 2. Necesitamos la fecha y el número de asiento para ordenar
    // Hacemos un fetch de los asientos relacionados
    const asientoIds = [...new Set(apuntesCuenta.map(a => a.asiento_id))];

    const tx = db.transaction('asientos', 'readonly');
    const store = tx.objectStore('asientos');

    const asientosMap = {};
    for (const id of asientoIds) {
        const asiento = await store.get(id);
        if (asiento) asientosMap[id] = asiento;
    }
    await tx.done;

    // 3. Combinar y ordenar
    const movimientos = apuntesCuenta.map(apunte => {
        const asiento = asientosMap[apunte.asiento_id];
        return {
            ...apunte,
            fecha: asiento ? asiento.fecha : '1970-01-01',
            asiento_numero: asiento ? asiento.numero : 0,
            asiento_concepto: asiento ? asiento.concepto : ''
        };
    });

    // Ordenar por fecha y número (las fechas YYYY-MM-DD ordenan bien como string)
    movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.asiento_numero - b.asiento_numero);

    // 4. Calcular saldos acumulados
    let saldo = 0;
    const movimientosConSaldo = movimientos.map(m => {
        saldo += (m.debe || 0) - (m.haber || 0);
        return { ...m, saldo };
    });

    return movimientosConSaldo;
};
