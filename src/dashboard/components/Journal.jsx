import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Edit2, Trash2, FileText } from 'lucide-react';
import { getAsientos, getCuentas, deleteAsiento } from '../../db';
import { formatNumber } from '../../utils/format';
import { exportDiarioToPDF } from '../../utils/pdfExport';
import EntryForm from './EntryForm';
import ConfirmModal from './ConfirmModal';

export default function Journal({ ejercicio }) {
    const [asientos, setAsientos] = useState([]);
    const [cuentasMap, setCuentasMap] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAsiento, setEditingAsiento] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estado para el modal de confirmación
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    useEffect(() => {
        loadData();
    }, [ejercicio.id]);

    const loadData = async () => {
        setLoading(true);
        const [asientosList, cuentasList] = await Promise.all([
            getAsientos(ejercicio.id),
            getCuentas(ejercicio.id)
        ]);

        const map = {};
        cuentasList.forEach(c => map[c.codigo] = c.nombre);
        setCuentasMap(map);

        setAsientos(asientosList);
        setLoading(false);
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirm deletion',
            message: 'Are you sure you want to delete this entry? This action cannot be undone.',
            onConfirm: async () => {
                await deleteAsiento(id);
                loadData();
            }
        });
    };

    const handleEdit = (asiento) => {
        setEditingAsiento(asiento);
        setShowForm(true);
    };

    // Filtrar por concepto, número de asiento, código o nombre de cuenta
    const term = searchTerm.trim().toLowerCase();
    const filteredAsientos = !term ? asientos : asientos.filter(a =>
        (a.concepto || '').toLowerCase().includes(term) ||
        String(a.numero) === term.replace('#', '') ||
        (a.apuntes || []).some(ap =>
            ap.cuenta_codigo.startsWith(term) ||
            (ap.concepto_linea || '').toLowerCase().includes(term) ||
            (cuentasMap[ap.cuenta_codigo] || '').toLowerCase().includes(term)
        )
    );

    return (
        <div style={{ position: 'relative' }}>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search entries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem 0.5rem 0.5rem 2.25rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="btn"
                        onClick={() => exportDiarioToPDF(asientos, cuentasMap, ejercicio)}
                        disabled={asientos.length === 0}
                        title="Export the full Journal to PDF"
                        style={{ background: 'white', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}
                    >
                        <FileText size={18} />
                        PDF
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingAsiento(null);
                            setShowForm(true);
                        }}
                    >
                        <Plus size={18} style={{ marginRight: '0.5rem' }} /> New Entry
                    </button>
                </div>
            </div>

            {/* Lista de Asientos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredAsientos.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
                        <p>{term ? 'No entries match your search.' : 'No entries recorded in this period yet.'}</p>
                    </div>
                )}

                {filteredAsientos.map(asiento => (
                    <div key={asiento.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: '0.75rem 1.5rem',
                            background: '#f8fafc',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>#{asiento.numero}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                    <Calendar size={14} />
                                    <span>{new Date(asiento.fecha).toLocaleDateString('en-US')}</span>
                                </div>
                                <span style={{ fontWeight: 500 }}>{asiento.concepto}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleEdit(asiento)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                    title="Edit entry"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(asiento.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                                    title="Delete entry"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <table className="table-std">
                            <thead>
                                <tr style={{ textAlign: 'left' }}>
                                    <th style={{ padding: '0.5rem 1.5rem', width: '15%' }}>Account</th>
                                    <th style={{ padding: '0.5rem 1.5rem', width: '35%' }}>Name</th>
                                    <th style={{ padding: '0.5rem 1.5rem', width: '30%' }}>Memo</th>
                                    <th style={{ padding: '0.5rem 1.5rem', textAlign: 'right', width: '10%' }}>Debit</th>
                                    <th style={{ padding: '0.5rem 1.5rem', textAlign: 'right', width: '10%' }}>Credit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {asiento.apuntes && asiento.apuntes.map((apunte, idx) => (
                                    <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '0.5rem 1.5rem', fontFamily: 'monospace' }}>{apunte.cuenta_codigo}</td>
                                        <td style={{ padding: '0.5rem 1.5rem' }}>{cuentasMap[apunte.cuenta_codigo] || '---'}</td>
                                        <td style={{ padding: '0.5rem 1.5rem', color: 'var(--color-text-muted)' }}>{apunte.concepto_linea}</td>
                                        <td style={{ padding: '0.5rem 1.5rem', textAlign: 'right' }}>{apunte.debe ? formatNumber(apunte.debe) : ''}</td>
                                        <td style={{ padding: '0.5rem 1.5rem', textAlign: 'right' }}>{apunte.haber ? formatNumber(apunte.haber) : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            {showForm && (
                <EntryForm
                    ejercicioId={ejercicio.id}
                    anyo={ejercicio.anyo}
                    initialData={editingAsiento}
                    onClose={() => {
                        setShowForm(false);
                        setEditingAsiento(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditingAsiento(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}
