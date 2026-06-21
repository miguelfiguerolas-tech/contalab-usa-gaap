import React, { useState, useEffect } from 'react';
import { BookOpen, LayoutDashboard, Calculator, Settings, FileText, LogOut, List, Home, ClipboardCheck, Download, Coffee } from 'lucide-react';
import { getEjercicios } from '../db';
import { exportEjercicio } from '../db/backup';
import { BMC_URL } from '../utils/links';
import ExerciseList from './components/ExerciseList';
import Journal from './components/Journal';
import Ledger from './components/Ledger';
import Balances from './components/Balances';
import Config from './components/Config';
import Summary from './components/Summary';
import ChartOfAccounts from './components/ChartOfAccounts';
import DashboardHome from './components/DashboardHome';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('inicio');
    const [activeEjercicio, setActiveEjercicio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cuentaMayor, setCuentaMayor] = useState(null); // cuenta preseleccionada al saltar desde Auditoría
    const [toast, setToast] = useState('');

    const showToast = (text) => {
        setToast(text);
        setTimeout(() => setToast(''), 3000);
    };

    useEffect(() => {
        // Recuperar el último ejercicio activo si sigue existiendo en la BD
        const restore = async () => {
            const savedId = parseInt(localStorage.getItem('contalab_last_ejercicio'));
            if (savedId) {
                try {
                    const list = await getEjercicios();
                    const ejercicio = list.find(e => e.id === savedId);
                    if (ejercicio) {
                        setActiveEjercicio(ejercicio);
                    } else {
                        localStorage.removeItem('contalab_last_ejercicio');
                    }
                } catch (error) {
                    console.error('Error restaurando el último ejercicio:', error);
                }
            }
            setLoading(false);
        };
        restore();
    }, []);

    const handleSelectEjercicio = (ejercicio) => {
        setActiveEjercicio(ejercicio);
        localStorage.setItem('contalab_last_ejercicio', ejercicio.id);
        setActiveTab('inicio');
    };

    const handleLogout = () => {
        setActiveEjercicio(null);
        localStorage.removeItem('contalab_last_ejercicio');
    };

    const handleVerCuenta = (codigo) => {
        setCuentaMayor(codigo);
        setActiveTab('mayor');
    };

    // Descarga directa del JSON de entrega (mismo formato que en Gestión)
    const handleExportJSON = async () => {
        try {
            const json = await exportEjercicio(activeEjercicio.id);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contalab_${activeEjercicio.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('✓ Submission downloaded');
        } catch (error) {
            console.error('Error exporting:', error);
            showToast('✗ Error exporting the period');
        }
    };

    if (loading) return null;

    // Si no hay ejercicio seleccionado, mostramos la lista
    if (!activeEjercicio) {
        return <ExerciseList onSelect={handleSelectEjercicio} />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'inicio':
                return <DashboardHome ejercicio={activeEjercicio} />;
            case 'resumen':
                return <Summary ejercicio={activeEjercicio} onVerCuenta={handleVerCuenta} />;
            case 'diario':
                return <Journal ejercicio={activeEjercicio} />;
            case 'mayor':
                return <Ledger ejercicio={activeEjercicio} initialCuenta={cuentaMayor} />;
            case 'plan':
                return <ChartOfAccounts ejercicio={activeEjercicio} />;
            case 'balances':
                return <Balances ejercicio={activeEjercicio} />;
            case 'config':
                return <Config ejercicio={activeEjercicio} />;
            default:
                return <div>Select an option</div>;
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--color-bg)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                backgroundColor: 'white',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem'
            }}>
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--color-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>CL</div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>ContaLab</h1>
                </div>

                <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Active period</p>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{activeEjercicio.nombre}</p>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-danger)',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginTop: '0.5rem'
                        }}
                    >
                        <LogOut size={20} />
                        Close period
                    </button>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <NavItem icon={<Home size={20} />} label="Dashboard" active={activeTab === 'inicio'} onClick={() => setActiveTab('inicio')} />
                    <NavItem icon={<BookOpen size={20} />} label="Journal" active={activeTab === 'diario'} onClick={() => setActiveTab('diario')} />
                    <NavItem icon={<FileText size={20} />} label="General Ledger" active={activeTab === 'mayor'} onClick={() => { setCuentaMayor(null); setActiveTab('mayor'); }} />
                    <NavItem icon={<List size={20} />} label="Chart of Accounts" active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
                    <NavItem icon={<Calculator size={20} />} label="Statements" active={activeTab === 'balances'} onClick={() => setActiveTab('balances')} />
                    <NavItem icon={<ClipboardCheck size={20} />} label="Review" active={activeTab === 'resumen'} onClick={() => setActiveTab('resumen')} />
                    <NavItem icon={<Download size={20} />} label="Export Submission" active={false} onClick={handleExportJSON} />
                </nav>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <NavItem icon={<Settings size={20} />} label="Settings & Credits" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
                    <a
                        href={BMC_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            color: '#b45309',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            textDecoration: 'none'
                        }}
                    >
                        <Coffee size={20} />
                        Buy me a coffee
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {activeTab === 'inicio' ? 'Dashboard' :
                            activeTab === 'diario' ? 'Journal' :
                                activeTab === 'mayor' ? 'General Ledger' :
                                    activeTab === 'balances' ? 'Financial Statements' :
                                        activeTab === 'resumen' ? 'Review & Correction' :
                                            activeTab === 'plan' ? 'Chart of Accounts' :
                                                'Settings & Credits'}
                    </h2>

                </header>

                {renderContent()}
            </main>

            {/* Toast de confirmación */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '1.5rem',
                    right: '1.5rem',
                    background: 'var(--color-text-main)',
                    color: 'white',
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    zIndex: 2000
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
}

function NavItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                width: '100%',
                border: 'none',
                background: active ? 'var(--color-bg)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left'
            }}
        >
            {icon}
            {label}
        </button>
    );
}
