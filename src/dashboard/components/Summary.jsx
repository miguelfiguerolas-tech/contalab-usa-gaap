import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Scale, Lock } from 'lucide-react';
import { getAsientos } from '../../db';
import { getSumasYSaldos, getBalanceSituacion, getCuentaResultados } from '../../db/balances';
import { crearAsientoRegularizacion, crearAsientoCierre } from '../../db/cierre';
import { isCash, isExpense, isRevenue } from '../../db/accountTypes';
import { formatCurrency } from '../../utils/format';
import { EPSILON } from '../../utils/money';
import ConfirmModal from './ConfirmModal';

export default function Summary({ ejercicio, onVerCuenta }) {
    const [audit, setAudit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cierreMsg, setCierreMsg] = useState({ type: '', text: '' });
    const [working, setWorking] = useState(false);
    const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }

    const runAudit = useCallback(async () => {
        setLoading(true);
        try {
            const [asientos, sumas, balance, pyg] = await Promise.all([
                getAsientos(ejercicio.id),
                getSumasYSaldos(ejercicio.id),
                getBalanceSituacion(ejercicio.id),
                getCuentaResultados(ejercicio.id)
            ]);

            // 1. Validar Cuadre Diario Global
            const totalDebe = sumas.reduce((acc, c) => acc + c.sumaDebe, 0);
            const totalHaber = sumas.reduce((acc, c) => acc + c.sumaHaber, 0);
            const descuadreDiario = Math.abs(totalDebe - totalHaber);

            // 2. Negative cash (Cash accounts 10xx with a credit balance)
            const tesoreriaRoja = sumas.filter(c => isCash(c.codigo) && c.saldoAcreedor > 0);

            // 3. Validar Ecuación Contable
            const totalActivo = balance.activo.reduce((s, node) => s + node.amount, 0);
            const totalPatrimonioPasivo = balance.patrimonioPasivo.reduce((s, node) => s + node.amount, 0);
            const ecuacionDiff = Math.abs(totalActivo - totalPatrimonioPasivo);

            // 4. Net income for the period
            const filaResultado = pyg.find(row => row.id === 'NET_INCOME');
            const resultadoPyG = filaResultado ? filaResultado.amount : 0;

            // 5. Detect opening and closing entries.
            // getAsientos returns descending order: sort by number to look at the
            // first and last real journal entries.
            const porNumero = [...asientos].sort((a, b) => a.numero - b.numero);
            const tieneApertura = porNumero.length > 0 && porNumero[0].concepto.toLowerCase().includes('opening');
            const tieneCierre = porNumero.length > 0 && porNumero[porNumero.length - 1].concepto.toLowerCase().includes('closing');

            // 5b. Rango de redacción (cuándo se crearon los asientos), para la ficha de entrega
            const fechasCreacion = asientos.map(a => a.created_at).filter(Boolean).sort();
            const redaccion = fechasCreacion.length > 0
                ? { desde: fechasCreacion[0], hasta: fechasCreacion[fechasCreacion.length - 1] }
                : null;

            // 6. Unnatural balances: a payable with a debit balance, or a
            // receivable with a credit balance.
            const saldosAntinaturales = sumas.filter(c => {
                const esPayable = c.codigo === '2010' && c.saldoDeudor > c.saldoAcreedor;
                const esReceivable = (c.codigo === '1100' || c.codigo === '1200') && c.saldoAcreedor > c.saldoDeudor;
                return esPayable || esReceivable;
            });

            // 6b. Revenue/expense accounts with an inverted balance (usually a
            // reversed entry). Skip the contra accounts that legitimately carry
            // the opposite sign: 4020/4030 (sales returns and discounts) and
            // 5030/5040 (purchase returns and discounts).
            const esExcepcionSigno = (codigo) =>
                /^(4020|4030|5030|5040)/.test(codigo);
            const gastosIngresosInvertidos = sumas.filter(c => {
                if (esExcepcionSigno(c.codigo)) return false;
                const gastoAcreedor = isExpense(c.codigo) && c.saldoAcreedor > c.saldoDeudor;
                const ingresoDeudor = isRevenue(c.codigo) && c.saldoDeudor > c.saldoAcreedor;
                return gastoAcreedor || ingresoDeudor;
            });

            // 7. Missing depreciation: depreciable PP&E present (1510-1545) but no
            // Depreciation Expense (6030) recorded.
            const tieneInmovilizado = sumas.some(c => /^15[1-4]/.test(c.codigo));
            const tieneGastoAmortizacion = sumas.some(c => c.codigo.startsWith('6030'));
            const olvidoAmortizacion = tieneInmovilizado && !tieneGastoAmortizacion;

            // 8. Missing cost of goods sold: inventory present (1300) but no cost
            // of sales (5xxx) recorded.
            const tieneExistencias = sumas.some(c => c.codigo.startsWith('1300'));
            const tieneVariacion = sumas.some(c => c.codigo.startsWith('5'));
            const olvidoVariacion = tieneExistencias && !tieneVariacion;

            setAudit({
                totalDebe,
                totalHaber,
                descuadreDiario,
                tesoreriaRoja,
                resultado: resultadoPyG,
                totalActivo,
                numAsientos: asientos.length,
                tieneApertura,
                tieneCierre,
                redaccion,
                ecuacionDiff,
                saldosAntinaturales,
                gastosIngresosInvertidos,
                olvidoAmortizacion,
                olvidoVariacion
            });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [ejercicio.id]);

    useEffect(() => {
        runAudit();
    }, [runAudit]);

    const doRegularizar = async () => {
        setWorking(true);
        setCierreMsg({ type: '', text: '' });
        try {
            const resultado = await crearAsientoRegularizacion(ejercicio.id, ejercicio.anyo);
            setCierreMsg({ type: 'success', text: `Closing entry posted. Net income for the period: ${formatCurrency(resultado)}. You can view it (or delete it to undo) in the Journal.` });
            runAudit();
        } catch (error) {
            setCierreMsg({ type: 'error', text: error.message });
        } finally {
            setWorking(false);
        }
    };

    const doCerrar = async () => {
        setWorking(true);
        setCierreMsg({ type: '', text: '' });
        try {
            await crearAsientoCierre(ejercicio.id, ejercicio.anyo);
            setCierreMsg({ type: 'success', text: 'Closing entry posted. Income Summary and Dividends are now closed to Retained Earnings. Delete it in the Journal if you want to undo it.' });
            runAudit();
        } catch (error) {
            setCierreMsg({ type: 'error', text: error.message });
        } finally {
            setWorking(false);
        }
    };

    const handleRegularizar = () => {
        setConfirmModal({
            title: 'Close to Income Summary',
            message: `This posts the first closing entry dated 12/31/${ejercicio.anyo}: it closes every revenue and expense account to Income Summary (3900). Continue?`,
            onConfirm: doRegularizar
        });
    };

    const handleCerrar = () => {
        setConfirmModal({
            title: 'Close to Retained Earnings',
            message: `This posts the second closing entry dated 12/31/${ejercicio.anyo}: it closes Income Summary and Dividends to Retained Earnings. Continue?`,
            onConfirm: doCerrar
        });
    };

    if (loading) return <div style={{ padding: '2rem' }}>Analyzing the books...</div>;

    if (!audit) return null;

    const fmtFecha = (iso) => iso ? new Date(iso).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

            <ConfirmModal
                isOpen={confirmModal !== null}
                title={confirmModal?.title}
                message={confirmModal?.message}
                onConfirm={confirmModal?.onConfirm}
                onClose={() => setConfirmModal(null)}
            />

            {/* FICHA DE ENTREGA: solo para ejercicios importados */}
            {ejercicio.entrega && (
                <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
                    <h4 className="title-md" style={{ marginBottom: '1rem' }}>
                        📋 Submission details (imported file)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Original name</p>
                            <p style={{ fontWeight: 500 }}>{ejercicio.entrega.nombre_original || '—'}</p>
                        </div>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Content fingerprint</p>
                            <p style={{ fontWeight: 500, fontFamily: 'monospace' }}>{ejercicio.entrega.huella || 'no fingerprint (old export)'}</p>
                        </div>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Source installation</p>
                            <p style={{ fontWeight: 500, fontFamily: 'monospace' }}>{ejercicio.entrega.instalacion_id ? ejercicio.entrega.instalacion_id.slice(0, 8) : '—'}</p>
                        </div>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Exported on</p>
                            <p style={{ fontWeight: 500 }}>{fmtFecha(ejercicio.entrega.fecha_exportacion)}</p>
                        </div>
                        {audit.redaccion && (
                            <div>
                                <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Entries written between</p>
                                <p style={{ fontWeight: 500 }}>{fmtFecha(audit.redaccion.desde)} and {fmtFecha(audit.redaccion.hasta)}</p>
                            </div>
                        )}
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Two submissions with the same <strong>fingerprint</strong> have identical accounting content (a direct copy).
                        The same <strong>source installation</strong> means they came from the same browser.
                    </p>
                </div>
            )}

            {/* SECCIÓN 1: VALIDACIONES CRÍTICAS (SEMÁFORO) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

                <StatusCard
                    title="Journal Integrity"
                    status={audit.descuadreDiario < EPSILON ? 'ok' : 'error'}
                    value={audit.descuadreDiario < EPSILON ? 'In balance' : `Out of balance: ${formatCurrency(audit.descuadreDiario)}`}
                    description="Total debits vs total credits across all entries."
                />

                <StatusCard
                    title="Negative Cash (10xx)"
                    status={audit.tesoreriaRoja.length === 0 ? 'ok' : 'warning'}
                    value={audit.tesoreriaRoja.length === 0 ? 'OK' : `${audit.tesoreriaRoja.length} account(s) negative`}
                    description={audit.tesoreriaRoja.length > 0 ? 'Review in the Ledger:' : "No credit balances in Cash."}
                    accounts={audit.tesoreriaRoja.map(c => c.codigo)}
                    onAccountClick={onVerCuenta}
                />

                <StatusCard
                    title="Accounting Equation"
                    status={audit.ecuacionDiff < EPSILON ? 'ok' : 'warning'}
                    value={audit.ecuacionDiff < EPSILON ? 'Balanced' : 'Possible Error'}
                    description="Assets = Liabilities + Equity"
                />

                <StatusCard
                    title="Natural Balances"
                    status={audit.saldosAntinaturales.length === 0 ? 'ok' : 'warning'}
                    value={audit.saldosAntinaturales.length === 0 ? 'OK' : `${audit.saldosAntinaturales.length} odd account(s)`}
                    description={audit.saldosAntinaturales.length > 0 ? 'Review in the Ledger:' : "Receivables and payables have the expected sign."}
                    accounts={audit.saldosAntinaturales.map(c => c.codigo)}
                    onAccountClick={onVerCuenta}
                />

                <StatusCard
                    title="Depreciation"
                    status={!audit.olvidoAmortizacion ? 'ok' : 'error'}
                    value={!audit.olvidoAmortizacion ? 'OK' : 'Missing depreciation'}
                    description={!audit.olvidoAmortizacion
                        ? "Depreciation expense found, or no depreciable assets."
                        : "You have depreciable PP&E (1510-1545) but no Depreciation Expense (6030)."}
                />

                <StatusCard
                    title="Revenue / Expense Sign"
                    status={audit.gastosIngresosInvertidos.length === 0 ? 'ok' : 'error'}
                    value={audit.gastosIngresosInvertidos.length === 0 ? 'OK' : `${audit.gastosIngresosInvertidos.length} inverted account(s)`}
                    description={audit.gastosIngresosInvertidos.length > 0
                        ? 'Expense credited or revenue debited: usually a reversed entry.'
                        : 'Expenses carry debit balances and revenues carry credit balances.'}
                    accounts={audit.gastosIngresosInvertidos.map(c => c.codigo)}
                    onAccountClick={onVerCuenta}
                />

                <StatusCard
                    title="Accounting Cycle"
                    status={audit.tieneApertura && audit.tieneCierre ? 'ok' : 'warning'}
                    value={
                        audit.tieneApertura && audit.tieneCierre ? 'Complete' :
                            audit.tieneApertura ? 'Missing closing' :
                                audit.tieneCierre ? 'Missing opening' : 'No opening or closing'
                    }
                    description={'Looks for "opening" in the first entry and "closing" in the last. May not apply to your period.'}
                />

                <StatusCard
                    title="Cost of Goods Sold"
                    status={!audit.olvidoVariacion ? 'ok' : 'error'}
                    value={!audit.olvidoVariacion ? 'OK' : 'Missing COGS'}
                    description={!audit.olvidoVariacion
                        ? "Cost of sales found, or no inventory."
                        : "You have inventory (1300) but no cost of sales (5xxx) recorded."}
                />
            </div>

            {/* SECTION 2: KEY FIGURES */}
            <h4 className="title-md" style={{ marginBottom: '1rem' }}>Key Figures for the Period</h4>
            <div className="card" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', textAlign: 'center' }}>
                <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Net Income (Profit/Loss)</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: audit.resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {formatCurrency(audit.resultado)}
                    </p>
                </div>
                <div style={{ borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Assets</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                        {formatCurrency(audit.totalActivo)}
                    </p>
                </div>
                <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}># of Entries</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                        {audit.numAsientos}
                    </p>
                </div>
            </div>

            {/* SECTION 3: CLOSING ASSISTANT */}
            <h4 className="title-md" style={{ marginBottom: '1rem' }}>Closing the Books (Assistant)</h4>
            <div className="card" style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                    Posts the real closing entries dated 12/31/{ejercicio.anyo}, in two steps and in this order.
                    Both appear in the Journal as normal entries: you can review them and delete them to undo.
                </p>

                {cierreMsg.text && (
                    <div className={`alert alert-${cierreMsg.type}`} style={{ marginBottom: '1rem' }}>
                        {cierreMsg.text}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleRegularizar}
                        disabled={working}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Scale size={18} />
                        1. Close to Income Summary (Rev/Exp → 3900)
                    </button>
                    <button
                        className="btn"
                        onClick={handleCerrar}
                        disabled={working}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid var(--color-border)' }}
                    >
                        <Lock size={18} />
                        2. Close to Retained Earnings
                    </button>
                </div>
            </div>

        </div>
    );
}

function StatusCard({ title, status, value, description, accounts = [], onAccountClick }) {
    const colors = {
        ok: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: <CheckCircle size={24} /> },
        warning: { bg: '#fefce8', border: '#fde047', text: '#854d0e', icon: <AlertTriangle size={24} /> },
        error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: <XCircle size={24} /> }
    };
    const c = colors[status];

    return (
        <div style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: c.text }}>
                {c.icon}
                <span style={{ fontWeight: 'bold' }}>{title}</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#1e293b' }}>
                {value}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {description}
            </div>
            {accounts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem' }}>
                    {accounts.map(codigo => (
                        <button
                            key={codigo}
                            onClick={() => onAccountClick && onAccountClick(codigo)}
                            title={`View the ledger for account ${codigo}`}
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: `1px solid ${c.border}`,
                                background: 'rgba(255,255,255,0.7)',
                                color: c.text,
                                cursor: onAccountClick ? 'pointer' : 'default'
                            }}
                        >
                            {codigo} →
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}


