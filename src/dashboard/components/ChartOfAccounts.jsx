import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { getCuentas, addCuenta, updateCuenta, deleteCuenta } from '../../db';
import ConfirmModal from './ConfirmModal';
import GroupFilter from './GroupFilter';

export default function ChartOfAccounts({ ejercicio }) {
    const [cuentas, setCuentas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [grupoFiltro, setGrupoFiltro] = useState('');
    const [formData, setFormData] = useState({ codigo: '', nombre: '' });
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estado para el modal de confirmación
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    useEffect(() => {
        loadCuentas();
    }, [ejercicio.id]);

    const loadCuentas = async () => {
        const list = await getCuentas(ejercicio.id);
        list.sort((a, b) => a.codigo.localeCompare(b.codigo));
        setCuentas(list);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!formData.codigo || !formData.nombre) {
            setError('All fields are required.');
            return;
        }

        // Between 3 and 6 digits: the default chart uses 4-digit codes and
        // custom sub-accounts are usually 5-6 digits.
        if (!/^\d{3,6}$/.test(formData.codigo)) {
            setError('The account code must be 3 to 6 numeric digits.');
            return;
        }

        // Check for duplicates (excluding the account itself when editing)
        const duplicado = cuentas.find(c => c.codigo === formData.codigo && c.id !== editingId);
        if (duplicado) {
            setError('An account with this code already exists.');
            return;
        }

        if (editingId) {
            // Confirm before editing
            setConfirmModal({
                isOpen: true,
                title: 'Confirm change',
                message: 'Are you sure you want to edit this account? If you changed the code, all related entries will be updated automatically.',
                onConfirm: async () => {
                    try {
                        await updateCuenta(editingId, formData.codigo, formData.nombre);
                        setSuccess(`Account ${formData.codigo} updated successfully.`);
                        setFormData({ codigo: '', nombre: '' });
                        setEditingId(null);
                        loadCuentas();
                    } catch (err) {
                        console.error(err);
                        setError(err.message || 'Error saving the account.');
                    }
                }
            });
        } else {
            try {
                await addCuenta(ejercicio.id, formData.codigo, formData.nombre);
                setSuccess(`Account ${formData.codigo} created successfully.`);
                setFormData({ codigo: '', nombre: '' });
                loadCuentas();
            } catch (err) {
                console.error(err);
                setError(err.message || 'Error saving the account.');
            }
        }
    };

    const handleEdit = (cuenta) => {
        setEditingId(cuenta.id);
        setFormData({ codigo: cuenta.codigo, nombre: cuenta.nombre });
        setError('');
        setSuccess('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ codigo: '', nombre: '' });
        setError('');
        setSuccess('');
    };

    const handleDelete = (id, codigo) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirm deletion',
            message: `Are you sure you want to delete account ${codigo}? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    await deleteCuenta(id);
                    setSuccess(`Account ${codigo} deleted successfully.`);
                    loadCuentas();
                    if (editingId === id) handleCancelEdit();
                } catch (err) {
                    console.error(err);
                    setError(err.message); // Show error if it has related entries
                }
            }
        });
    };

    const filteredCuentas = cuentas.filter(c =>
        (!grupoFiltro || c.codigo.startsWith(grupoFiltro)) &&
        (c.codigo.includes(searchTerm) || c.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 150px)', position: 'relative' }}>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />

            {/* Panel Izquierdo: Lista de Cuentas */}
            <div className="card" style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="title-md">Chart of Accounts ({cuentas.length})</h3>
                    <div style={{ position: 'relative', width: '250px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search account..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem 0.5rem 0.5rem 2rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)'
                            }}
                        />
                    </div>
                </div>

                <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--color-border)', background: '#f8fafc' }}>
                    <GroupFilter value={grupoFiltro} onChange={setGrupoFiltro} />
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table className="table-std">
                        <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem 1.5rem', width: '20%' }}>Code</th>
                                <th style={{ padding: '0.75rem 1.5rem', width: '60%' }}>Account Name</th>
                                <th style={{ padding: '0.75rem 1.5rem', width: '20%', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCuentas.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: editingId === c.id ? '#eff6ff' : 'transparent' }}>
                                    <td style={{ padding: '0.75rem 1.5rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                        {c.codigo}
                                    </td>
                                    <td style={{ padding: '0.75rem 1.5rem' }}>
                                        {c.nombre}
                                    </td>
                                    <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEdit(c)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id, c.codigo)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCuentas.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No accounts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Panel Derecho: Formulario (Crear / Editar) */}
            <div style={{ flex: 1 }}>
                <div className="card" style={{ position: 'sticky', top: 0, border: editingId ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="title-md" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: editingId ? 'var(--color-primary)' : 'inherit' }}>
                            {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
                            {editingId ? 'Edit Account' : 'New Account'}
                        </h3>
                        {editingId && (
                            <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', gap: '0.5rem' }}>
                            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{ padding: '0.75rem', background: '#f0fdf4', color: '#166534', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Code (3 to 6 digits)</label>
                            <input
                                type="text"
                                value={formData.codigo}
                                onChange={(e) => {
                                    // Solo permitir números y máximo 6 caracteres
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setFormData({ ...formData, codigo: val });
                                }}
                                placeholder="e.g. 110001"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: '1rem' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                {editingId ? 'If you change the code, all entries will be updated.' : 'It should belong to an existing group (e.g. 1100...).'}
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Account Name</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="e.g. Accounts Receivable (Customer X)"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="btn"
                                    style={{ flex: 1, justifyContent: 'center', background: '#f1f5f9', color: 'var(--color-text-main)' }}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1, justifyContent: 'center' }}
                                disabled={!formData.codigo || !formData.nombre || formData.codigo.length < 3}
                            >
                                {editingId ? 'Save Changes' : 'Create Account'}
                            </button>
                        </div>
                    </form>
                </div>

                {!editingId && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>💡 Tip:</p>
                        <p>Accounts are sorted automatically. If you create account <strong>110001</strong>, it will appear right below <strong>1100</strong> in every list.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
