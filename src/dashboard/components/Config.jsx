import React, { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { exportEjercicio, importEjercicio } from '../../db/backup';
import { BMC_URL, STORE_REVIEW_URL, FEEDBACK_MAILTO, GITHUB_URL } from '../../utils/links';

export default function Config({ ejercicio, onImportSuccess }) {
    // Estado para Export/Import
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleExport = async () => {
        setExporting(true);
        try {
            const json = await exportEjercicio(ejercicio.id);

            // Crear blob y descargar
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contalab_${ejercicio.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: 'Period exported successfully.' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Error exporting.' });
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                await importEjercicio(evt.target.result);
                setMessage({ type: 'success', text: 'Period imported successfully. Open it from the selection menu: the Review tab shows the submission details and grading checks.' });
                if (onImportSuccess) onImportSuccess();
            } catch (error) {
                console.error(error);
                setMessage({ type: 'error', text: 'Import error: ' + error.message });
            } finally {
                setImporting(false);
                e.target.value = null; // Reset input
            }
        };
        reader.readAsText(file);
    };



    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

            {message.text && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '2rem',
                    borderRadius: 'var(--radius-md)',
                    background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                }}>
                    {message.text}
                </div>
            )}

            {/* Sección: Gestión de Datos */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 className="title-md" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    Backups
                </h3>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={exporting}
                        style={{ gap: '0.5rem' }}
                    >
                        <Download size={18} />
                        {exporting ? 'Exporting...' : 'Export Current Period'}
                    </button>

                    <div style={{ height: '40px', width: '1px', background: 'var(--color-border)' }}></div>

                    <label className="btn" style={{ gap: '0.5rem', background: 'white', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                        <Upload size={18} />
                        {importing ? 'Importing...' : 'Import Period'}
                        <input type="file" accept=".json" onChange={handleImport} disabled={importing} style={{ display: 'none' }} />
                    </label>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Export your data to keep or submit it. Import a .json file to restore a period.
                </p>
            </div>


            {/* Sección: Acerca de */}
            <div className="card">
                <h3 className="title-md" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    About ContaLab
                </h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                    <p style={{ marginBottom: '0.5rem' }}>
                        <strong>Developed by:</strong> Miguel Figuerola
                    </p>
                    <p style={{ marginBottom: '1rem' }}>
                        An educational tool built to make learning accounting simpler.
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <a
                            href={BMC_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1.25rem',
                                background: '#fde68a',
                                color: '#78350f',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                                border: '1px solid #f59e0b'
                            }}
                        >
                            ☕ Buy me a coffee
                        </a>
                        <a
                            href={STORE_REVIEW_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ textDecoration: 'none', fontSize: '0.9rem' }}
                        >
                            ⭐ Review on the Web Store
                        </a>
                        <a
                            href={FEEDBACK_MAILTO}
                            className="btn btn-secondary"
                            style={{ textDecoration: 'none', fontSize: '0.9rem' }}
                        >
                            ✉️ Send feedback
                        </a>
                        <a
                            href={GITHUB_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ textDecoration: 'none', fontSize: '0.9rem' }}
                        >
                            🐙 Source on GitHub
                        </a>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                        ContaLab is free. If it helps in class, a 5-star review and your
                        suggestions are the best way to support it.
                    </p>

                    <div style={{
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{ fontSize: '1.5rem' }}>⚖️</div>
                        <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>MIT License</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                Free and open-source software: you may use, distribute and modify it freely, keeping the original copyright notice.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
