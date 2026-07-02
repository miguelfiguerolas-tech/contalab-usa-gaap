import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { getCuentas, createAsiento, updateAsiento } from '../../db';
import { formatCurrency } from '../../utils/format';
import { EPSILON } from '../../utils/money';

export default function EntryForm({ ejercicioId, anyo, initialData, onClose, onSuccess }) {
    const [fecha, setFecha] = useState(initialData ? initialData.fecha : new Date().toISOString().split('T')[0]);
    const [conceptoGlobal, setConceptoGlobal] = useState(initialData ? initialData.concepto : '');
    // 'texto' guarda lo que el usuario teclea; 'cuenta_codigo' el código resuelto.
    // Si fueran lo mismo, el input se reescribiría a "código - nombre" en cuanto
    // lo tecleado coincidiera con una cuenta, impidiendo escribir subcuentas
    // (ej. 430001 cuando existe la 430).
    const [lines, setLines] = useState(initialData ? initialData.apuntes.map((a, i) => ({
        id: a.id ?? `initial-${i}`, // Ensure ID for key (stable, render must stay pure)
        cuenta_codigo: a.cuenta_codigo,
        texto: null, // null = mostrar "código - nombre" derivado
        debe: a.debe || '',
        haber: a.haber || '',
        concepto: a.concepto_linea
    })) : [
        { id: 1, cuenta_codigo: '', texto: null, debe: '', haber: '', concepto: '' },
        { id: 2, cuenta_codigo: '', texto: null, debe: '', haber: '', concepto: '' }
    ]);
    const [cuentas, setCuentas] = useState([]);
    const [error, setError] = useState('');

    const loadCuentas = useCallback(async () => {
        try {
            const list = await getCuentas(ejercicioId);
            setCuentas(list);
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }, [ejercicioId]);

    useEffect(() => {
        loadCuentas();
    }, [loadCuentas]);

    const handleLineChange = (id, field, value) => {
        setLines(prevLines => prevLines.map(line =>
            line.id === id ? { ...line, [field]: value } : line
        ));
    };

    // Texto visible del campo cuenta: lo tecleado si el usuario ha escrito,
    // o "código - nombre" derivado (caso inicial al editar un asiento).
    const displayCuenta = (line) => {
        if (line.texto !== null) return line.texto;
        const c = cuentas.find(a => a.codigo === line.cuenta_codigo);
        return c ? `${c.codigo} - ${c.nombre}` : line.cuenta_codigo;
    };

    const handleCuentaChange = (id, val) => {
        // Resolver el código: acepta "430 - Clientes" (datalist) o el código a pelo
        const potentialCode = val.split(' - ')[0].trim();
        const account = cuentas.find(a => a.codigo === potentialCode);

        setLines(prevLines => prevLines.map(line =>
            line.id === id
                ? { ...line, texto: val, cuenta_codigo: account ? account.codigo : val.trim() }
                : line
        ));
    };

    // Al salir del campo, normalizar a "código - nombre" si la cuenta existe
    const handleCuentaBlur = (id) => {
        setLines(prevLines => prevLines.map(line => {
            if (line.id !== id) return line;
            const c = cuentas.find(a => a.codigo === line.cuenta_codigo);
            return c ? { ...line, texto: `${c.codigo} - ${c.nombre}` } : line;
        }));
    };

    const handleAmountChange = (id, field, value) => {
        setLines(prevLines => prevLines.map(line => {
            if (line.id !== id) return line;

            const updates = { [field]: value };
            // Si escribimos en Debe, borramos Haber, y viceversa
            if (value && field === 'debe') updates.haber = '';
            if (value && field === 'haber') updates.debe = '';

            return { ...line, ...updates };
        }));
    };

    const addLine = () => {
        setLines([...lines, { id: Date.now(), cuenta_codigo: '', texto: null, debe: '', haber: '', concepto: '' }]);
    };

    const removeLine = (id) => {
        if (lines.length > 2) {
            setLines(lines.filter(l => l.id !== id));
        }
    };

    const calculateTotals = () => {
        const totalDebe = lines.reduce((sum, line) => sum + (parseFloat(line.debe) || 0), 0);
        const totalHaber = lines.reduce((sum, line) => sum + (parseFloat(line.haber) || 0), 0);
        return { totalDebe, totalHaber, diff: totalDebe - totalHaber };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const { diff } = calculateTotals();
        if (Math.abs(diff) > EPSILON) {
            setError(`The entry is out of balance. Difference: ${formatCurrency(diff)}`);
            return;
        }

        if (!conceptoGlobal) {
            setError('Please enter a description for the entry.');
            return;
        }

        if (lines.some(l => parseFloat(l.debe) < 0 || parseFloat(l.haber) < 0)) {
            setError('Amounts cannot be negative: post to the opposite column instead.');
            return;
        }

        // Detectar líneas a medias (cuenta sin importe o importe sin cuenta):
        // antes se descartaban en silencio al guardar.
        const incompletas = lines.filter(l => {
            const tieneCuenta = (l.cuenta_codigo || '').trim() !== '';
            const tieneImporte = l.debe || l.haber;
            return (tieneCuenta && !tieneImporte) || (!tieneCuenta && tieneImporte);
        });
        if (incompletas.length > 0) {
            setError('Some lines are incomplete (account without amount, or amount without account). Complete or remove them.');
            return;
        }

        // Validate there are selected accounts
        const validLines = lines.filter(l => l.cuenta_codigo && (l.debe || l.haber));
        if (validLines.length < 2) {
            setError('The entry must have at least 2 valid lines.');
            return;
        }

        // Validate the accounts exist
        const invalidAccounts = validLines.filter(l => !cuentas.find(c => c.codigo === l.cuenta_codigo));
        if (invalidAccounts.length > 0) {
            setError(`The following accounts do not exist: ${invalidAccounts.map(l => l.cuenta_codigo).join(', ')}. Create them in the Chart of Accounts first.`);
            return;
        }

        try {
            if (initialData) {
                await updateAsiento(initialData.id, fecha, conceptoGlobal, validLines);
            } else {
                await createAsiento(ejercicioId, fecha, conceptoGlobal, validLines);
            }
            onSuccess();
        } catch (err) {
            console.error(err);
            setError('Error saving the entry.');
        }
    };

    const { totalDebe, totalHaber, diff } = calculateTotals();
    const isBalanced = Math.abs(diff) < EPSILON;

    // Aviso (no bloqueante) si la fecha cae fuera del año del ejercicio.
    // El año se lee del string (YYYY-MM-DD): new Date() lo trataría como UTC
    // y el 1 de enero caería en el año anterior en zonas horarias americanas.
    const fueraDeAnyo = anyo && fecha && Number(fecha.slice(0, 4)) !== Number(anyo);

    return (
        <div className="modal-overlay">
            <div className="card" style={{ width: '900px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="title-lg">
                        {initialData ? `Edit Entry #${initialData.numero}` : 'New Entry'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                {/* Form Content */}
                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>

                    {/* Cabecera Asiento */}
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label className="label">Date</label>
                            <input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                className="input"
                                style={fueraDeAnyo ? { borderColor: '#f59e0b' } : undefined}
                            />
                            {fueraDeAnyo && (
                                <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
                                    ⚠ Outside period {anyo}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="label">Description</label>
                            <input
                                type="text"
                                value={conceptoGlobal}
                                onChange={(e) => setConceptoGlobal(e.target.value)}
                                placeholder="e.g. Owner investment"
                                className="input"
                            />
                        </div>
                    </div>

                    {/* Líneas */}
                    <datalist id="account-options">
                        {cuentas.map(c => (
                            <option key={c.id} value={`${c.codigo} - ${c.nombre}`} />
                        ))}
                    </datalist>

                    <table className="table-std" style={{ marginBottom: '1rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                                <th style={{ padding: '0.5rem', width: '35%' }}>Account</th>
                                <th style={{ padding: '0.5rem', width: '25%' }}>Memo (optional)</th>
                                <th style={{ padding: '0.5rem', width: '15%', textAlign: 'right' }}>Debit</th>
                                <th style={{ padding: '0.5rem', width: '15%', textAlign: 'right' }}>Credit</th>
                                <th style={{ padding: '0.5rem', width: '5%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line) => (
                                <tr key={line.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '0.5rem' }}>
                                        <input
                                            list="account-options"
                                            type="text"
                                            value={displayCuenta(line)}
                                            onChange={(e) => handleCuentaChange(line.id, e.target.value)}
                                            onBlur={() => handleCuentaBlur(line.id)}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="Search account..."
                                            className="input"
                                        />
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <input
                                            type="text"
                                            value={line.concepto}
                                            onChange={(e) => handleLineChange(line.id, 'concepto', e.target.value)}
                                            placeholder={conceptoGlobal || "Memo..."}
                                            className="input"
                                        />
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={line.debe}
                                            onChange={(e) => handleAmountChange(line.id, 'debe', e.target.value)}
                                            className="input"
                                            style={{ textAlign: 'right' }}
                                        />
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={line.haber}
                                            onChange={(e) => handleAmountChange(line.id, 'haber', e.target.value)}
                                            className="input"
                                            style={{ textAlign: 'right' }}
                                        />
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                        <button
                                            onClick={() => removeLine(line.id)}
                                            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                            tabIndex={-1}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        onClick={addLine}
                        className="btn"
                        style={{ fontSize: '0.875rem', color: 'var(--color-primary)', padding: '0.5rem 0' }}
                    >
                        <Plus size={16} style={{ marginRight: '0.25rem' }} /> Add line
                    </button>

                </div>

                {/* Footer & Totals */}
                <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid var(--color-border)' }}>
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '2rem', fontSize: '1rem' }}>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>Total Debit:</span>
                                <span style={{ fontWeight: 'bold' }}>{formatCurrency(totalDebe)}</span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>Total Credit:</span>
                                <span style={{ fontWeight: 'bold' }}>{formatCurrency(totalHaber)}</span>
                            </div>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>Out of balance:</span>
                                <span style={{ fontWeight: 'bold', color: isBalanced ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {formatCurrency(Math.abs(diff))}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" onClick={onClose} style={{ background: 'white', border: '1px solid var(--color-border)' }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={!isBalanced}>
                                <Save size={18} style={{ marginRight: '0.5rem' }} /> Save Entry
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
