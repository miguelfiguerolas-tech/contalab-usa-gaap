import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Calendar, Activity } from 'lucide-react';
import { getSumasYSaldos } from '../../db/balances';
import { getAsientos } from '../../db';
import { isRevenue, isExpense, isCash } from '../../db/accountTypes';
import { formatCurrency } from '../../utils/format';
import { STORE_REVIEW_URL, FEEDBACK_MAILTO } from '../../utils/links';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardHome({ ejercicio }) {
    const [kpis, setKpis] = useState({
        ingresos: 0,
        gastos: 0,
        resultado: 0,
        tesoreria: 0
    });
    const [gastosData, setGastosData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [sumas, asientos] = await Promise.all([
                getSumasYSaldos(ejercicio.id),
                getAsientos(ejercicio.id)
            ]);

            // 1. KPIs a partir del balance de sumas y saldos
            let totalIngresos = 0;
            let totalGastos = 0;
            let totalTesoreria = 0;

            sumas.forEach(c => {
                if (isRevenue(c.codigo)) totalIngresos += c.saldoAcreedor - c.saldoDeudor; // revenue: credit
                if (isExpense(c.codigo)) totalGastos += c.saldoDeudor - c.saldoAcreedor;    // expense: debit
                if (isCash(c.codigo)) totalTesoreria += c.saldoDeudor - c.saldoAcreedor;    // cash: debit
            });

            const resultado = totalIngresos - totalGastos;

            setKpis({
                ingresos: totalIngresos,
                gastos: totalGastos,
                resultado,
                tesoreria: totalTesoreria
            });

            // 2. Expense distribution
            // Filter expense accounts with a positive (debit) balance
            const gastosCuentas = sumas
                .filter(c => isExpense(c.codigo) && (c.saldoDeudor - c.saldoAcreedor) > 0)
                .map(c => ({
                    name: c.nombre,
                    value: c.saldoDeudor - c.saldoAcreedor
                }))
                .sort((a, b) => b.value - a.value);

            // Take top 5 and group others
            let finalGastos = [];
            if (gastosCuentas.length > 5) {
                const top5 = gastosCuentas.slice(0, 5);
                const others = gastosCuentas.slice(5).reduce((acc, curr) => acc + curr.value, 0);
                finalGastos = [...top5, { name: 'Other', value: others }];
            } else {
                finalGastos = gastosCuentas;
            }
            setGastosData(finalGastos);

            // Pedir valoración cuando ya hay uso real y aún no se ha valorado
            setShowReview(asientos.length >= 5 && !localStorage.getItem('contalab_review_done'));

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [ejercicio.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard...</div>;

    // Al valorar o enviar sugerencias, no volver a pedir nunca
    const handleReviewDone = () => {
        localStorage.setItem('contalab_review_done', '1');
        setShowReview(false);
    };

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
            {/* Header */}
            {/* Header Date Only */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Calendar size={16} />
                        {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Petición de valoración */}
            {showReview && (
                <div className="card" style={{
                    marginBottom: '2rem',
                    background: 'linear-gradient(to right, #eff6ff, #f5f3ff)',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Is ContaLab helping you? ⭐</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                            A 5-star review on the Chrome Web Store helps it reach more students.
                            And if something could be better, let me know.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <a
                            href={STORE_REVIEW_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleReviewDone}
                            className="btn btn-primary"
                            style={{ textDecoration: 'none', fontSize: '0.875rem' }}
                        >
                            ⭐ Leave a 5-star review
                        </a>
                        <a
                            href={FEEDBACK_MAILTO}
                            onClick={handleReviewDone}
                            className="btn btn-secondary"
                            style={{ textDecoration: 'none', fontSize: '0.875rem' }}
                        >
                            Send feedback
                        </a>
                        <button
                            className="btn"
                            onClick={() => setShowReview(false)}
                            style={{ background: 'transparent', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}
                        >
                            Not now
                        </button>
                    </div>
                </div>
            )}

            {/* KPIs Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <KpiCard
                    title="Total Revenue"
                    amount={kpis.ingresos}
                    icon={<TrendingUp size={24} color="#059669" />}
                    bg="#ecfdf5"
                    border="#a7f3d0"
                />
                <KpiCard
                    title="Total Expenses"
                    amount={kpis.gastos}
                    icon={<TrendingDown size={24} color="#e11d48" />}
                    bg="#fff1f2"
                    border="#fecdd3"
                />
                <KpiCard
                    title="Net Income"
                    amount={kpis.resultado}
                    icon={<DollarSign size={24} color="#2563eb" />}
                    bg="#eff6ff"
                    border="#bfdbfe"
                />
                <KpiCard
                    title="Cash"
                    amount={kpis.tesoreria}
                    icon={<Wallet size={24} color="#7c3aed" />}
                    bg="#f5f3ff"
                    border="#ddd6fe"
                />
            </div>

            {/* Ranking de Gastos */}
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h3 className="title-md" style={{ marginBottom: '1.5rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} />
                    Top Expenses
                </h3>

                {gastosData.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {gastosData.map((item, index) => {
                            const percentage = kpis.gastos > 0 ? (item.value / kpis.gastos) * 100 : 0;
                            const color = COLORS[index % COLORS.length];

                            return (
                                <div key={index}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        <span style={{ fontWeight: 500, color: '#334155' }}>{item.name}</span>
                                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{formatCurrency(item.value)}</span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        background: '#f1f5f9',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${percentage}%`,
                                            height: '100%',
                                            background: color,
                                            borderRadius: '4px',
                                            transition: 'width 1s ease-in-out'
                                        }} />
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                        {percentage.toFixed(1)}% of total
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <p>No expenses recorded yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function KpiCard({ title, amount, icon, bg, border }) {
    return (
        <div style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b', marginBottom: '0.25rem' }}>{title}</p>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1e293b' }}>
                        {formatCurrency(amount)}
                    </h3>
                </div>
                <div style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.6)',
                    borderRadius: '0.5rem',
                    backdropFilter: 'blur(4px)'
                }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
