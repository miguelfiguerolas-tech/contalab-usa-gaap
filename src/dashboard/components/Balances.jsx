import React, { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import { getSumasYSaldos, getBalanceSituacion, getCuentaResultados } from '../../db/balances';
import { exportToPDF } from '../../utils/pdfExport';
import { formatCurrency } from '../../utils/format';

// Componente recursivo para renderizar nodos del Balance
const BalanceNode = ({ node, level = 0 }) => {
    // Si el nodo tiene monto 0 y no tiene hijos con monto, podríamos ocultarlo si quisiéramos compactar.
    // Pero para un balance oficial, a veces se prefiere mostrar la estructura completa o al menos los grupos principales.
    // Aquí ocultaremos si es 0 para limpiar la vista, excepto si es nivel raíz.
    if (node.amount === 0 && level > 1) return null;

    const indent = level * 1.5;
    const isBold = level < 2;
    const fontSize = level === 0 ? '1rem' : '0.875rem';
    const color = level === 0 ? 'var(--color-text-main)' : 'var(--color-text-muted)';

    return (
        <>
            <tr style={{ borderBottom: level === 0 ? '2px solid var(--color-border)' : '1px solid #f8fafc' }}>
                <td style={{
                    padding: '0.5rem 1rem',
                    paddingLeft: `${1 + indent}rem`,
                    fontWeight: isBold ? 'bold' : 'normal',
                    fontSize: fontSize,
                    color: color
                }}>
                    {node.label}
                </td>
                <td style={{
                    padding: '0.5rem 1rem',
                    textAlign: 'right',
                    fontWeight: isBold ? 'bold' : 'normal',
                    fontSize: fontSize
                }}>
                    {node.amount !== 0 ? formatCurrency(node.amount) : '-'}
                </td>
            </tr>
            {node.children && node.children.map(child => (
                <BalanceNode key={child.id} node={child} level={level + 1} />
            ))}
        </>
    );
};

export default function Balances({ ejercicio }) {
    const [activeTab, setActiveTab] = useState('sumas'); // sumas, situacion, pyg
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [ejercicio.id, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'sumas') {
                const res = await getSumasYSaldos(ejercicio.id);
                setData(res);
            } else if (activeTab === 'situacion') {
                const res = await getBalanceSituacion(ejercicio.id);
                setData(res);
            } else if (activeTab === 'pyg') {
                const res = await getCuentaResultados(ejercicio.id);
                setData(res);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        if (!data) return;
        exportToPDF(activeTab, data, ejercicio);
    };

    const handleExportCSV = () => {
        if (!data) return;

        // CSV format: comma separator, dot decimal, quoted text fields
        const num = (n) => n.toFixed(2);
        const txt = (s) => `"${String(s).replace(/"/g, '""')}"`;

        let csvContent = "";
        let fileName = "";

        if (activeTab === 'sumas') {
            fileName = `TrialBalance_${ejercicio.nombre}.csv`;
            csvContent += "Account,Name,Total Debit,Total Credit,Debit Balance,Credit Balance\n";
            data.forEach(row => {
                const line = [
                    row.codigo,
                    txt(row.nombre),
                    num(row.sumaDebe),
                    num(row.sumaHaber),
                    num(row.saldoDeudor),
                    num(row.saldoAcreedor)
                ].join(",");
                csvContent += line + "\n";
            });
        } else if (activeTab === 'situacion') {
            fileName = `BalanceSheet_${ejercicio.nombre}.csv`;

            const flatten = (nodes, level = 0) => {
                let rows = [];
                nodes.forEach(node => {
                    if (node.amount !== 0 || level <= 1) { // Same visibility logic as UI
                        const indent = "  ".repeat(level);
                        rows.push([txt(`${indent}${node.label}`), num(node.amount)].join(","));
                        if (node.children) {
                            rows = rows.concat(flatten(node.children, level + 1));
                        }
                    }
                });
                return rows;
            };

            csvContent += "ASSETS,Amount\n";
            csvContent += flatten(data.activo).join("\n");
            csvContent += "\n\nLIABILITIES & EQUITY,Amount\n";
            csvContent += flatten(data.patrimonioPasivo).join("\n");

        } else if (activeTab === 'pyg') {
            fileName = `IncomeStatement_${ejercicio.nombre}.csv`;
            csvContent += "Item,Amount\n";
            data.forEach(row => {
                if (!row) return;
                csvContent += [txt(row.label), num(row.amount)].join(",") + "\n";
            });
        }

        // BOM so Excel recognizes UTF-8
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderSumasYSaldos = () => {
        if (!data || !Array.isArray(data)) return null;

        const totalSumaDebe = data.reduce((acc, curr) => acc + curr.sumaDebe, 0);
        const totalSumaHaber = data.reduce((acc, curr) => acc + curr.sumaHaber, 0);
        const totalSaldoDeudor = data.reduce((acc, curr) => acc + curr.saldoDeudor, 0);
        const totalSaldoAcreedor = data.reduce((acc, curr) => acc + curr.saldoAcreedor, 0);

        return (
            <div style={{ overflowX: 'auto' }}>
                <table className="table-std" style={{ minWidth: '800px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Account</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Total Debit</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Total Credit</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Debit Balance</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Credit Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.codigo} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{row.codigo}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>{row.nombre}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.sumaDebe > 0 ? formatCurrency(row.sumaDebe) : '-'}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.sumaHaber > 0 ? formatCurrency(row.sumaHaber) : '-'}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: row.saldoDeudor > 0 ? 'bold' : 'normal' }}>{row.saldoDeudor > 0 ? formatCurrency(row.saldoDeudor) : '-'}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: row.saldoAcreedor > 0 ? 'bold' : 'normal' }}>{row.saldoAcreedor > 0 ? formatCurrency(row.saldoAcreedor) : '-'}</td>
                            </tr>
                        ))}
                        {/* Totales */}
                        <tr style={{ background: '#f1f5f9', fontWeight: 'bold', borderTop: '2px solid var(--color-border)' }}>
                            <td colSpan="2" style={{ padding: '1rem', textAlign: 'right' }}>TOTALS</td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>{formatCurrency(totalSumaDebe)}</td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>{formatCurrency(totalSumaHaber)}</td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>{formatCurrency(totalSaldoDeudor)}</td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>{formatCurrency(totalSaldoAcreedor)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const renderSituacion = () => {
        if (!data || !data.activo) return null;

        const totalActivo = data.activo.reduce((acc, node) => acc + node.amount, 0);
        const totalPatrimonioPasivo = data.patrimonioPasivo.reduce((acc, node) => acc + node.amount, 0);

        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Activo */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                        <h3 style={{ color: '#166534', fontWeight: 'bold' }}>ASSETS</h3>
                    </div>
                    <div style={{ padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {data.activo.map(node => (
                                    <BalanceNode key={node.id} node={node} />
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f0fdf4', borderTop: '2px solid #166534' }}>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#166534' }}>TOTAL ASSETS</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: '#166534' }}>{formatCurrency(totalActivo)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Pasivo + Neto */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                        <h3 style={{ color: '#991b1b', fontWeight: 'bold' }}>LIABILITIES & EQUITY</h3>
                    </div>
                    <div style={{ padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {data.patrimonioPasivo.map(node => (
                                    <BalanceNode key={node.id} node={node} />
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#fef2f2', borderTop: '2px solid #991b1b' }}>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#991b1b' }}>TOTAL LIABILITIES & EQUITY</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: '#991b1b' }}>{formatCurrency(totalPatrimonioPasivo)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderPyG = () => {
        if (!data || !Array.isArray(data)) return null;

        return (
            <div className="card" style={{ maxWidth: '900px', margin: '0 auto', padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                    <h3 className="title-lg" style={{ textAlign: 'center' }}>Income Statement</h3>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {data.map(row => {
                            if (!row) return null;
                            const isTotal = row.isTotal;
                            const isResult = row.id === 'NET_INCOME';

                            return (
                                <tr key={row.id} style={{
                                    borderBottom: '1px solid #f1f5f9',
                                    background: isResult ? '#f0fdf4' : (isTotal ? '#f8fafc' : 'white')
                                }}>
                                    <td style={{
                                        padding: '0.75rem 1.5rem',
                                        fontWeight: isTotal ? 'bold' : 'normal',
                                        color: isTotal ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                                        fontSize: isResult ? '1.1rem' : '0.9rem'
                                    }}>
                                        {row.label}
                                    </td>
                                    <td style={{
                                        padding: '0.75rem 1.5rem',
                                        textAlign: 'right',
                                        fontWeight: isTotal ? 'bold' : 'normal',
                                        width: '150px',
                                        color: row.amount < 0 ? 'var(--color-danger)' : (isResult ? 'var(--color-success)' : 'inherit')
                                    }}>
                                        {row.amount !== 0 ? formatCurrency(row.amount) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className={`btn ${activeTab === 'sumas' ? 'btn-primary' : ''}`}
                        style={{ background: activeTab !== 'sumas' ? 'white' : undefined, border: activeTab !== 'sumas' ? '1px solid var(--color-border)' : undefined }}
                        onClick={() => setActiveTab('sumas')}
                    >
                        Trial Balance
                    </button>
                    <button
                        className={`btn ${activeTab === 'situacion' ? 'btn-primary' : ''}`}
                        style={{ background: activeTab !== 'situacion' ? 'white' : undefined, border: activeTab !== 'situacion' ? '1px solid var(--color-border)' : undefined }}
                        onClick={() => setActiveTab('situacion')}
                    >
                        Balance Sheet
                    </button>
                    <button
                        className={`btn ${activeTab === 'pyg' ? 'btn-primary' : ''}`}
                        style={{ background: activeTab !== 'pyg' ? 'white' : undefined, border: activeTab !== 'pyg' ? '1px solid var(--color-border)' : undefined }}
                        onClick={() => setActiveTab('pyg')}
                    >
                        Income Statement
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="btn"
                        onClick={handleExportPDF}
                        disabled={!data}
                        style={{ background: 'white', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}
                    >
                        <FileText size={18} />
                        PDF
                    </button>
                    <button
                        className="btn"
                        onClick={handleExportCSV}
                        disabled={!data}
                        style={{ background: 'white', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}
                    >
                        <Download size={18} />
                        CSV
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Calculating...</div>
            ) : (
                <>
                    {activeTab === 'sumas' && renderSumasYSaldos()}
                    {activeTab === 'situacion' && renderSituacion()}
                    {activeTab === 'pyg' && renderPyG()}
                </>
            )}
        </div>
    );
}
