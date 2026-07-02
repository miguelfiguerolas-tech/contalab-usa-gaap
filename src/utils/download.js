import { exportEjercicio } from '../db/backup';

// Descarga un archivo generado en memoria (patrón blob + <a> temporal).
export const downloadFile = (filename, content, mimeType = 'application/json') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Exporta un ejercicio y lo descarga con el nombre estándar
// contalab_<nombre>_<fecha>.json (mismo formato en Gestión y en la barra lateral).
export const downloadEjercicioJSON = async (ejercicio) => {
    const json = await exportEjercicio(ejercicio.id);
    const fecha = new Date().toISOString().split('T')[0];
    downloadFile(`contalab_${ejercicio.nombre.replace(/\s+/g, '_')}_${fecha}.json`, json);
};
