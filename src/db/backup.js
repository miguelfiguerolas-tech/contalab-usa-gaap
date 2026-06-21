import { initDB } from './index';

// Identificador anónimo de esta instalación (se genera una vez y persiste).
// Sirve para detectar entregas que salen del mismo navegador/perfil.
const getInstalacionId = () => {
    let id = localStorage.getItem('contalab_instalacion_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('contalab_instalacion_id', id);
    }
    return id;
};

// Huella SHA-256 (recortada) del contenido contable. Dos archivos con los
// mismos asientos y apuntes producen la misma huella, aunque se reexporten
// desde otra instalación: permite detectar entregas idénticas.
const computeHuella = async (asientos, apuntes) => {
    const normalizado = JSON.stringify({
        asientos: asientos
            .map(a => [a.numero, a.fecha, a.concepto])
            .sort(),
        apuntes: apuntes
            .map(p => [p.cuenta_codigo, p.debe || 0, p.haber || 0, p.concepto_linea || ''])
            .sort()
    });

    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizado));
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16);
};

export const exportEjercicio = async (ejercicioId) => {
    const db = await initDB();

    // 1. Obtener datos
    const ejercicio = await db.get('ejercicios', ejercicioId);
    const cuentas = await db.getAllFromIndex('cuentas', 'ejercicio_id', ejercicioId);
    const asientos = await db.getAllFromIndex('asientos', 'ejercicio_id', ejercicioId);
    const apuntes = await db.getAllFromIndex('apuntes', 'ejercicio_id', ejercicioId);

    // 2. Empaquetar con metadatos de trazabilidad
    const backup = {
        version: 1,
        fecha_exportacion: new Date().toISOString(),
        meta: {
            instalacion_id: getInstalacionId(),
            huella: await computeHuella(asientos, apuntes),
            ejercicio_creado: ejercicio.fecha_creacion || null
        },
        data: {
            ejercicio,
            cuentas,
            asientos,
            apuntes
        }
    };

    return JSON.stringify(backup, null, 2);
};

export const importEjercicio = async (jsonString) => {
    let backup;
    try {
        backup = JSON.parse(jsonString);
    } catch (e) {
        throw new Error('The file is not valid JSON.');
    }

    if (!backup.data || !backup.data.ejercicio) {
        throw new Error('Invalid file format.');
    }

    if (backup.version && backup.version > 1) {
        throw new Error('This file comes from a newer version of ContaLab. Update the extension to import it.');
    }

    const db = await initDB();
    const tx = db.transaction(['ejercicios', 'cuentas', 'asientos', 'apuntes'], 'readwrite');

    try {
        // 1. Crear nuevo ejercicio
        // Usamos el nombre original + (Importado) para distinguir
        const oldEj = backup.data.ejercicio;
        const newEjId = await tx.objectStore('ejercicios').add({
            nombre: `${oldEj.nombre} (Imported)`,
            anyo: oldEj.anyo,
            fecha_creacion: new Date().toISOString(),
            // Ficha de entrega: metadatos del archivo importado, visibles en Auditoría
            entrega: {
                nombre_original: oldEj.nombre,
                huella: backup.meta?.huella || null,
                instalacion_id: backup.meta?.instalacion_id || null,
                fecha_exportacion: backup.fecha_exportacion || null,
                ejercicio_creado: oldEj.fecha_creacion || null,
                fecha_importacion: new Date().toISOString()
            }
        });

        // 2. Importar Cuentas
        // No necesitamos mapear IDs de cuentas porque los apuntes usan 'cuenta_codigo'
        const cuentasStore = tx.objectStore('cuentas');
        for (const c of backup.data.cuentas) {
            await cuentasStore.add({
                ejercicio_id: newEjId,
                codigo: c.codigo,
                nombre: c.nombre
            });
        }

        // 3. Importar Asientos y Apuntes
        // Aquí SÍ necesitamos mapear los IDs de los asientos, porque los apuntes refieren al asiento_id
        const asientosStore = tx.objectStore('asientos');
        const apuntesStore = tx.objectStore('apuntes');

        const asientoIdMap = {}; // oldId -> newId

        // Ordenar asientos por ID original para mantener orden relativo
        const oldAsientos = backup.data.asientos.sort((a, b) => a.id - b.id);

        for (const a of oldAsientos) {
            const newAsientoId = await asientosStore.add({
                ejercicio_id: newEjId,
                fecha: a.fecha,
                concepto: a.concepto,
                numero: a.numero,
                // Conservar la fecha de creación original: forma parte de la
                // trazabilidad de la entrega (cuándo se redactaron los asientos)
                created_at: a.created_at || new Date().toISOString()
            });
            asientoIdMap[a.id] = newAsientoId;
        }

        // Importar Apuntes
        for (const ap of backup.data.apuntes) {
            if (asientoIdMap[ap.asiento_id]) {
                await apuntesStore.add({
                    asiento_id: asientoIdMap[ap.asiento_id],
                    ejercicio_id: newEjId,
                    cuenta_codigo: ap.cuenta_codigo,
                    debe: ap.debe,
                    haber: ap.haber,
                    concepto_linea: ap.concepto_linea
                });
            }
        }

        await tx.done;
        return newEjId;
    } catch (error) {
        console.error("Error en importación:", error);
        try {
            tx.abort();
        } catch (e) {
            // La transacción puede haberse abortado ya por el propio error
        }
        throw new Error('Error saving the imported data.');
    }
};
