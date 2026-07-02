import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Table2, Columns2 } from 'lucide-react';
import { getCuentas } from '../../db';
import { getMayor } from '../../db/mayor';
import { formatNumber, formatDate } from '../../utils/format';
import { EPSILON } from '../../utils/money';
import GroupFilter from './GroupFilter';

export default function Ledger({ ejercicio, initialCuenta }) {
    const [cuentas, setCuentas] = useState([]);
    const [selectedCuenta, setSelectedCuenta] = useState('');
    const [movimientos, setMovimientos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [grupoFiltro, setGrupoFiltro] = useState('');
    const [vistaT, setVistaT] = useState(false); // false = statement, true = T-account

    const loadCuentas = useCallback(async () => {
        try {
            const list = await getCuentas(ejercicio.id);
            // Ordenar por código
            list.sort((a, b) => a.codigo.localeCompare(b.codigo));
            setCuentas(list);
            // Si venimos de Auditoría con una cuenta concreta, seleccionarla
            if (initialCuenta && list.some(c => c.codigo === initialCuenta)) {
                setSelectedCuenta(initialCuenta);
            } else if (list.length > 0) {
                setSelectedCuenta(list[0].codigo);
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }, [ejercicio.id, initialCuenta]);

    const loadMayor = useCallback(async (codigo) => {
        if (!codigo) {
            setMovimientos([]);
            return;
        }
        try {
            const data = await getMayor(ejercicio.id, codigo);
            setMovimientos(data);
        } catch (error) {
            console.error(error);
        }
    }, [ejercicio.id]);

    useEffect(() => {
        loadCuentas();
    }, [loadCuentas]);

    useEffect(() => {
        loadMayor(selectedCuenta);
    }, [selectedCuenta, loadMayor]);

    // Import dinámico: jsPDF pesa ~300 kB y solo hace falta al exportar
    const handleExportPDF = async () => {
        const { exportMayorToPDF } = await import('../../utils/pdfExport');
        exportMayorToPDF(movimientos, currentCuenta, ejercicio);
    };

    const currentCuenta = cuentas.find(c => c.codigo === selectedCuenta);

    const filteredCuentas = cuentas.filter(c =>
        (!grupoFiltro || c.codigo.startsWith(grupoFiltro)) &&
        (c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ display: 'flex', gap: '2rem', height: 'calc(100vh - 150px)' }}>
            {/* Sidebar de Cuentas */}
            <div className="card" style={{ width: '300px', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search account..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                            style={{ paddingLeft: '2rem' }}
                        />
                    </div>
                    <div style={{ marginTop: '0.6rem' }}>
                        <GroupFilter value={grupoFiltro} onChange={setGrupoFiltro} />
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredCuentas.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCuenta(c.codigo)}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.75rem 1rem',
                                background: selectedCuenta === c.codigo ? '#eff6ff' : 'transparent',
                                border: 'none',
                                borderLeft: selectedCuenta === c.codigo ? '3px solid var(--color-primary)' : '3px solid transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                            }}
                        >
                            <span style={{ fontWeight: 'bold', fontSize: '0.875rem', color: selectedCuenta === c.codigo ? 'var(--color-primary)' : 'var(--color-text-main)' }}>{c.codigo}</span>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Vista del Mayor */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                {currentCuenta ? (
                    <>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                            <h2 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ color: 'var(--color-primary)' }}>{currentCuenta.codigo}</span>
                                <span>{currentCuenta.nombre}</span>
                            </h2>
                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                <button
                                    className="btn"
                                    onClick={() => setVistaT(!vistaT)}
                                    title={vistaT ? 'View as statement' : 'View as T-account'}
                                    style={{ background: 'white', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                                >
                                    {vistaT ? <Table2 size={16} /> : <Columns2 size={16} />}
                                    {vistaT ? 'Statement' : 'T-account'}
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleExportPDF}
                                    disabled={movimientos.length === 0}
                                    title="Export this account's ledger to PDF"
                                    style={{ background: 'white', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#dc2626' }}
                                >
                                    <FileText size={16} />
                                    PDF
                                </button>
                            </div>
                        </div>

                        {vistaT ? (
                            <TAccount movimientos={movimientos} cuenta={currentCuenta} />
                        ) : (
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <table className="table-std">
                                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                                        <th style={{ padding: '1rem', width: '12%' }}>Date</th>
                                        <th style={{ padding: '1rem', width: '10%' }}>Entry</th>
                                        <th style={{ padding: '1rem', width: '38%' }}>Memo</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', width: '13%' }}>Debit</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', width: '13%' }}>Credit</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', width: '14%' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientos.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                No activity in this account.
                                            </td>
                                        </tr>
                                    ) : (
                                        movimientos.map((mov, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.75rem 1rem' }}>{formatDate(mov.fecha)}</td>
                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                    <span style={{
                                                        background: '#f1f5f9',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500
                                                    }}>
                                                        #{mov.asiento_numero}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                    <div style={{ fontWeight: 500 }}>{mov.concepto_linea}</div>
                                                    {mov.asiento_concepto !== mov.concepto_linea && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{mov.asiento_concepto}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                    {mov.debe ? formatNumber(mov.debe) : '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                    {mov.haber ? formatNumber(mov.haber) : '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                                    {formatNumber(mov.saldo)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                        Select an account to view its ledger
                    </div>
                )}
            </div>
        </div>
    );
}

// Representación clásica de cuenta en T: Debe a la izquierda, Haber a la derecha,
// como se dibuja en la pizarra.
function TAccount({ movimientos, cuenta }) {
    const cargos = movimientos.filter(m => m.debe);
    const abonos = movimientos.filter(m => m.haber);
    const sumaDebe = cargos.reduce((s, m) => s + m.debe, 0);
    const sumaHaber = abonos.reduce((s, m) => s + m.haber, 0);
    const saldo = sumaDebe - sumaHaber;

    if (movimientos.length === 0) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                No activity in this account.
            </div>
        );
    }

    const Linea = ({ mov, importe }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>#{mov.asiento_numero}</span>
            <span style={{ fontWeight: 500, textAlign: 'right' }}>{formatNumber(importe)}</span>
        </div>
    );

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '560px' }}>
                {/* Título de la T */}
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {cuenta.codigo} {cuenta.nombre}
                </div>

                {/* La T */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '3px solid var(--color-text-main)' }}>
                    {/* Debe */}
                    <div style={{ borderRight: '3px solid var(--color-text-main)', minHeight: '180px', paddingTop: '0.5rem' }}>
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>DEBIT</div>
                        {cargos.map((m, i) => <Linea key={i} mov={m} importe={m.debe} />)}
                    </div>
                    {/* Credit */}
                    <div style={{ minHeight: '180px', paddingTop: '0.5rem' }}>
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>CREDIT</div>
                        {abonos.map((m, i) => <Linea key={i} mov={m} importe={m.haber} />)}
                    </div>

                    {/* Sumas */}
                    <div style={{ borderRight: '3px solid var(--color-text-main)', borderTop: '1px solid var(--color-border)', padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>
                        {formatNumber(sumaDebe)}
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)', padding: '0.4rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>
                        {formatNumber(sumaHaber)}
                    </div>
                </div>

                {/* Saldo */}
                <div style={{
                    marginTop: '1rem',
                    textAlign: 'center',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.95rem'
                }}>
                    Balance: <strong>{formatNumber(Math.abs(saldo))}</strong>{' '}
                    <span style={{ color: 'var(--color-text-muted)' }}>
                        {saldo > EPSILON ? '(Debit)' : saldo < -EPSILON ? '(Credit)' : '(Zero)'}
                    </span>
                </div>
            </div>
        </div>
    );
}
