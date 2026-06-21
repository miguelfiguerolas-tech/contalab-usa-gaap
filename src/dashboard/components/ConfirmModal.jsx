import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Modal de confirmación compartido (antes duplicado en Journal y ChartOfAccounts)
export default function ConfirmModal({ isOpen, title, message, onConfirm, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="card" style={{ width: '400px', maxWidth: '90%', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--color-warning)' }}>
                    <AlertTriangle size={24} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>{title}</h3>
                </div>
                <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
