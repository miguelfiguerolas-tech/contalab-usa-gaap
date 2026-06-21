import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Trash2, Calendar } from 'lucide-react';
import { getEjercicios, createEjercicio, deleteEjercicio } from '../../db';

export default function ExerciseList({ onSelect }) {
    const [ejercicios, setEjercicios] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newNombre, setNewNombre] = useState('');
    const [newAnyo, setNewAnyo] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEjercicios();
    }, []);

    const loadEjercicios = async () => {
        try {
            const list = await getEjercicios();
            setEjercicios(list);
        } catch (error) {
            console.error("Error cargando ejercicios:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newNombre) return;

        try {
            await createEjercicio(newNombre, parseInt(newAnyo));
            setNewNombre('');
            setIsCreating(false);
            loadEjercicios();
        } catch (error) {
            console.error("Error creando ejercicio:", error);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this period? All data will be lost.')) {
            await deleteEjercicio(id);
            loadEjercicios();
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{
            maxWidth: '800px',
            margin: '4rem auto',
            padding: '0 1rem'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>ContaLab</h1>
                <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>Select a period to start working</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                {/* Card para Crear Nuevo */}
                <button
                    onClick={() => setIsCreating(true)}
                    style={{
                        background: 'transparent',
                        border: '2px dashed var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '180px',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        transition: 'all 0.2s'
                    }}
                    className="hover-border-primary"
                >
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'var(--color-bg)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem'
                    }}>
                        <Plus size={24} />
                    </div>
                    <span style={{ fontWeight: 500 }}>Create New Period</span>
                </button>

                {/* Lista de Ejercicios */}
                {ejercicios.map(ej => (
                    <div
                        key={ej.id}
                        className="card"
                        onClick={() => onSelect(ej)}
                        style={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            position: 'relative',
                            borderLeft: '4px solid var(--color-primary)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: '#eff6ff',
                                color: 'var(--color-primary)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FolderOpen size={20} />
                            </div>
                            <button
                                onClick={(e) => handleDelete(ej.id, e)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-text-muted)',
                                    padding: '4px',
                                    cursor: 'pointer'
                                }}
                                title="Delete period"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{ej.nombre}</h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            <Calendar size={14} />
                            <span>FY {ej.anyo}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Creación (Simplificado inline) */}
            {isCreating && (
                <div className="modal-overlay">
                    <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>New Period</h2>
                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Company / Period Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newNombre}
                                    onChange={(e) => setNewNombre(e.target.value)}
                                    placeholder="e.g. My Company Inc."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '1rem'
                                    }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Fiscal Year</label>
                                <input
                                    type="number"
                                    value={newAnyo}
                                    onChange={(e) => setNewAnyo(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '1rem'
                                    }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setIsCreating(false)}
                                    style={{ background: 'transparent', border: '1px solid var(--color-border)' }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Period
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
