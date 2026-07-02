import { openDB } from 'idb';
import { PGC_BASICO } from './coa_us';
import { round2 } from '../utils/money';

const DB_NAME = 'ContaLabDB';
const DB_VERSION = 1;

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // 1. Store: Ejercicios
            if (!db.objectStoreNames.contains('ejercicios')) {
                const store = db.createObjectStore('ejercicios', { keyPath: 'id', autoIncrement: true });
                store.createIndex('nombre', 'nombre', { unique: false });
            }

            // 2. Store: Cuentas
            if (!db.objectStoreNames.contains('cuentas')) {
                const store = db.createObjectStore('cuentas', { keyPath: 'id', autoIncrement: true });
                store.createIndex('ejercicio_id', 'ejercicio_id', { unique: false });
                store.createIndex('codigo', 'codigo', { unique: false });
                // Índice compuesto para buscar cuenta por código dentro de un ejercicio
                store.createIndex('ejercicio_codigo', ['ejercicio_id', 'codigo'], { unique: true });
            }

            // 3. Store: Asientos (Cabecera)
            if (!db.objectStoreNames.contains('asientos')) {
                const store = db.createObjectStore('asientos', { keyPath: 'id', autoIncrement: true });
                store.createIndex('ejercicio_id', 'ejercicio_id', { unique: false });
                store.createIndex('fecha', 'fecha', { unique: false });
                store.createIndex('numero', 'numero', { unique: false });
            }

            // 4. Store: Apuntes (Líneas del asiento)
            if (!db.objectStoreNames.contains('apuntes')) {
                const store = db.createObjectStore('apuntes', { keyPath: 'id', autoIncrement: true });
                store.createIndex('asiento_id', 'asiento_id', { unique: false });
                store.createIndex('ejercicio_id', 'ejercicio_id', { unique: false });
                store.createIndex('cuenta_codigo', 'cuenta_codigo', { unique: false });
                // Índice para Libro Mayor: buscar por ejercicio y cuenta
                store.createIndex('ejercicio_cuenta', ['ejercicio_id', 'cuenta_codigo'], { unique: false });
            }
        },
    });
};

// --- EJERCICIOS ---

export const getEjercicios = async () => {
    const db = await initDB();
    return db.getAll('ejercicios');
};

export const createEjercicio = async (nombre, anyo) => {
    const db = await initDB();
    const tx = db.transaction(['ejercicios', 'cuentas'], 'readwrite');

    const ejercicioId = await tx.objectStore('ejercicios').add({
        nombre,
        anyo,
        fecha_creacion: new Date().toISOString()
    });

    // Cargar Plan Contable Básico para este ejercicio
    const cuentasStore = tx.objectStore('cuentas');
    for (const cuenta of PGC_BASICO) {
        await cuentasStore.add({
            ejercicio_id: ejercicioId,
            codigo: cuenta.codigo,
            nombre: cuenta.nombre
        });
    }

    await tx.done;
    return ejercicioId;
};

export const deleteEjercicio = async (id) => {
    const db = await initDB();
    // Borrado en cascada: el ejercicio y todas sus cuentas, asientos y apuntes.
    const tx = db.transaction(['ejercicios', 'cuentas', 'asientos', 'apuntes'], 'readwrite');

    await tx.objectStore('ejercicios').delete(id);

    for (const storeName of ['cuentas', 'asientos', 'apuntes']) {
        const store = tx.objectStore(storeName);
        const keys = await store.index('ejercicio_id').getAllKeys(id);
        for (const key of keys) {
            await store.delete(key);
        }
    }

    await tx.done;
};

// --- CUENTAS ---

export const getCuentas = async (ejercicioId) => {
    const db = await initDB();
    return db.getAllFromIndex('cuentas', 'ejercicio_id', ejercicioId);
};

export const addCuenta = async (ejercicioId, codigo, nombre) => {
    const db = await initDB();
    return db.add('cuentas', {
        ejercicio_id: ejercicioId,
        codigo,
        nombre
    });
};

export const updateCuenta = async (id, nuevoCodigo, nuevoNombre) => {
    const db = await initDB();
    const tx = db.transaction(['cuentas', 'apuntes'], 'readwrite');

    const cuentaStore = tx.objectStore('cuentas');
    const cuenta = await cuentaStore.get(id);
    if (!cuenta) throw new Error('Account not found');

    const viejoCodigo = cuenta.codigo;
    const ejercicioId = cuenta.ejercicio_id;

    // Actualizar cuenta
    cuenta.codigo = nuevoCodigo;
    cuenta.nombre = nuevoNombre;
    await cuentaStore.put(cuenta);

    // Si el código cambió, actualizar todos los apuntes asociados
    if (viejoCodigo !== nuevoCodigo) {
        const apuntesStore = tx.objectStore('apuntes');
        const index = apuntesStore.index('ejercicio_cuenta');
        // getAllKeys no soporta array key range en todas las implementaciones, usamos getAll
        // El índice es ['ejercicio_id', 'cuenta_codigo']
        const apuntes = await index.getAll([ejercicioId, viejoCodigo]);

        for (const apunte of apuntes) {
            apunte.cuenta_codigo = nuevoCodigo;
            await apuntesStore.put(apunte);
        }
    }

    await tx.done;
};

export const deleteCuenta = async (id) => {
    const db = await initDB();
    const tx = db.transaction(['cuentas', 'apuntes'], 'readwrite');

    const cuentaStore = tx.objectStore('cuentas');
    const cuenta = await cuentaStore.get(id);
    if (!cuenta) return;

    // Verificar si tiene apuntes
    const apuntesStore = tx.objectStore('apuntes');
    const index = apuntesStore.index('ejercicio_cuenta');
    const apuntes = await index.getAll([cuenta.ejercicio_id, cuenta.codigo]);

    if (apuntes.length > 0) {
        throw new Error(`Account ${cuenta.codigo} cannot be deleted because it has ${apuntes.length} related entries.`);
    }

    await cuentaStore.delete(id);
    await tx.done;
};

// --- ASIENTOS ---

export const getAsientos = async (ejercicioId) => {
    const db = await initDB();
    // Obtenemos asientos
    const asientos = await db.getAllFromIndex('asientos', 'ejercicio_id', ejercicioId);

    // Obtenemos todos los apuntes del ejercicio (más eficiente que 1 query por asiento)
    const apuntes = await db.getAllFromIndex('apuntes', 'ejercicio_id', ejercicioId);

    // Agrupar apuntes por asiento_id
    const apuntesPorAsiento = {};
    apuntes.forEach(apunte => {
        if (!apuntesPorAsiento[apunte.asiento_id]) {
            apuntesPorAsiento[apunte.asiento_id] = [];
        }
        apuntesPorAsiento[apunte.asiento_id].push(apunte);
    });

    // Combinar
    const asientosCompletos = asientos.map(asiento => ({
        ...asiento,
        apuntes: apuntesPorAsiento[asiento.id] || []
    }));

    // Descendente por fecha y número (las fechas YYYY-MM-DD ordenan bien como string)
    return asientosCompletos.sort((a, b) =>
        (b.fecha || '').localeCompare(a.fecha || '') || b.numero - a.numero
    );
};

export const createAsiento = async (ejercicioId, fecha, concepto, apuntes) => {
    const db = await initDB();
    const tx = db.transaction(['asientos', 'apuntes'], 'readwrite');

    // Siguiente número de asiento: max(numero) + 1 del ejercicio actual.
    // (Contar asientos no vale: tras borrar uno intermedio se repetirían números).
    const asientosPrevios = await tx.objectStore('asientos').index('ejercicio_id').getAll(ejercicioId);
    const numero = asientosPrevios.reduce((max, a) => Math.max(max, a.numero || 0), 0) + 1;

    const asientoId = await tx.objectStore('asientos').add({
        ejercicio_id: ejercicioId,
        fecha,
        concepto,
        numero,
        created_at: new Date().toISOString()
    });

    const apuntesStore = tx.objectStore('apuntes');
    for (const apunte of apuntes) {
        await apuntesStore.add({
            asiento_id: asientoId,
            ejercicio_id: ejercicioId,
            cuenta_codigo: apunte.cuenta_codigo,
            debe: round2(parseFloat(apunte.debe) || 0),
            haber: round2(parseFloat(apunte.haber) || 0),
            concepto_linea: apunte.concepto || concepto // Hereda concepto si no tiene específico
        });
    }

    await tx.done;
    return asientoId;
};

export const deleteAsiento = async (id) => {
    const db = await initDB();
    const tx = db.transaction(['asientos', 'apuntes'], 'readwrite');

    // 1. Delete header
    await tx.objectStore('asientos').delete(id);

    // 2. Delete associated apuntes
    const apuntesStore = tx.objectStore('apuntes');
    const index = apuntesStore.index('asiento_id');
    const apuntesKeys = await index.getAllKeys(id);

    for (const key of apuntesKeys) {
        await apuntesStore.delete(key);
    }

    await tx.done;
};

export const updateAsiento = async (id, fecha, concepto, apuntes) => {
    const db = await initDB();
    const tx = db.transaction(['asientos', 'apuntes'], 'readwrite');

    // 1. Update header
    const asientoStore = tx.objectStore('asientos');
    const asiento = await asientoStore.get(id);
    if (!asiento) throw new Error('Entry not found');

    asiento.fecha = fecha;
    asiento.concepto = concepto;
    await asientoStore.put(asiento);

    // 2. Replace apuntes (Delete all old, add new)
    const apuntesStore = tx.objectStore('apuntes');
    const index = apuntesStore.index('asiento_id');
    const oldApuntesKeys = await index.getAllKeys(id);

    for (const key of oldApuntesKeys) {
        await apuntesStore.delete(key);
    }

    for (const apunte of apuntes) {
        await apuntesStore.add({
            asiento_id: id,
            ejercicio_id: asiento.ejercicio_id,
            cuenta_codigo: apunte.cuenta_codigo,
            debe: round2(parseFloat(apunte.debe) || 0),
            haber: round2(parseFloat(apunte.haber) || 0),
            concepto_linea: apunte.concepto || concepto
        });
    }

    await tx.done;
};
