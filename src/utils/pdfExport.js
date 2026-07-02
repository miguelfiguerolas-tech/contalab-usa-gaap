import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatNumber, formatDate } from './format';

// Exports the whole Journal: each entry with its header and lines.
export const exportDiarioToPDF = (asientos, cuentasMap, ejercicio) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Journal', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Company / Period: ${ejercicio.nombre}`, 14, 30);
    doc.text(`Issued: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 35);

    // The journal is shown in ascending chronological order.
    const ordenados = [...asientos].sort((a, b) =>
        (a.fecha || '').localeCompare(b.fecha || '') || a.numero - b.numero
    );

    const body = [];
    ordenados.forEach(asiento => {
        body.push([{
            content: `Entry #${asiento.numero}  ·  ${formatDate(asiento.fecha)}  ·  ${asiento.concepto}`,
            colSpan: 5,
            styles: { fontStyle: 'bold', fillColor: [241, 245, 249] }
        }]);

        (asiento.apuntes || []).forEach(ap => {
            body.push([
                ap.cuenta_codigo,
                cuentasMap[ap.cuenta_codigo] || '',
                ap.concepto_linea || '',
                ap.debe ? formatNumber(ap.debe) : '',
                ap.haber ? formatNumber(ap.haber) : ''
            ]);
        });
    });

    autoTable(doc, {
        startY: 45,
        head: [['Account', 'Name', 'Memo', 'Debit ($)', 'Credit ($)']],
        body,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 45 },
            3: { halign: 'right', cellWidth: 24 },
            4: { halign: 'right', cellWidth: 24 }
        }
    });

    doc.save(`Journal_${ejercicio.nombre}.pdf`);
};

// Exports a single account's ledger: running-balance statement.
export const exportMayorToPDF = (movimientos, cuenta, ejercicio) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`General Ledger — ${cuenta.codigo} ${cuenta.nombre}`, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Company / Period: ${ejercicio.nombre}`, 14, 30);
    doc.text(`Issued: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 35);

    const sumaDebe = movimientos.reduce((s, m) => s + (m.debe || 0), 0);
    const sumaHaber = movimientos.reduce((s, m) => s + (m.haber || 0), 0);
    const saldoFinal = sumaDebe - sumaHaber;

    const body = movimientos.map(m => [
        formatDate(m.fecha),
        `#${m.asiento_numero}`,
        m.concepto_linea || '',
        m.debe ? formatNumber(m.debe) : '',
        m.haber ? formatNumber(m.haber) : '',
        formatNumber(m.saldo)
    ]);

    body.push([
        { content: 'TOTALS AND ENDING BALANCE', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatNumber(sumaDebe), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatNumber(sumaHaber), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `${formatNumber(Math.abs(saldoFinal))} ${saldoFinal >= 0 ? 'Dr' : 'Cr'}`, styles: { fontStyle: 'bold', halign: 'right' } }
    ]);

    autoTable(doc, {
        startY: 45,
        head: [['Date', 'Entry', 'Memo', 'Debit ($)', 'Credit ($)', 'Balance ($)']],
        body,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 16 },
            3: { halign: 'right', cellWidth: 24 },
            4: { halign: 'right', cellWidth: 24 },
            5: { halign: 'right', cellWidth: 26 }
        }
    });

    doc.save(`Ledger_${cuenta.codigo}_${ejercicio.nombre}.pdf`);
};

export const exportToPDF = (type, data, ejercicio) => {
    const doc = new jsPDF();
    const title = type === 'sumas' ? 'Trial Balance' :
        type === 'situacion' ? 'Balance Sheet' :
            'Income Statement';

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Company / Period: ${ejercicio.nombre}`, 14, 30);
    doc.text(`Issued: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 35);

    let startY = 45;

    if (type === 'sumas') {
        generateSumasTable(doc, data, startY);
    } else if (type === 'situacion') {
        generateSituacionTable(doc, data, startY);
    } else if (type === 'pyg') {
        generatePyGTable(doc, data, startY);
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${ejercicio.nombre}.pdf`);
};



const generateSumasTable = (doc, data, startY) => {
    const tableData = data.map(row => [
        row.codigo,
        row.nombre,
        formatCurrency(row.sumaDebe),
        formatCurrency(row.sumaHaber),
        formatCurrency(row.saldoDeudor),
        formatCurrency(row.saldoAcreedor)
    ]);

    // Totals
    const totalSumaDebe = data.reduce((acc, curr) => acc + curr.sumaDebe, 0);
    const totalSumaHaber = data.reduce((acc, curr) => acc + curr.sumaHaber, 0);
    const totalSaldoDeudor = data.reduce((acc, curr) => acc + curr.saldoDeudor, 0);
    const totalSaldoAcreedor = data.reduce((acc, curr) => acc + curr.saldoAcreedor, 0);

    tableData.push([
        { content: 'TOTALS', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totalSumaDebe), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalSumaHaber), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalSaldoDeudor), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalSaldoAcreedor), styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
        startY: startY,
        head: [['Account', 'Name', 'Total Debit', 'Total Credit', 'Debit Bal.', 'Credit Bal.']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }, // Blue
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 'auto' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        },
        styles: { fontSize: 8 }
    });
};

const generateSituacionTable = (doc, data, startY) => {
    // Flatten helper
    const flatten = (nodes, level = 0) => {
        let rows = [];
        nodes.forEach(node => {
            // Show only if it has an amount or is a top-level group (level <= 1)
            if (node.amount !== 0 || level <= 1) {
                const indent = " ".repeat(level * 4); // Visual indentation with spaces
                rows.push({
                    label: indent + node.label,
                    amount: node.amount,
                    level: level
                });
                if (node.children) {
                    rows = rows.concat(flatten(node.children, level + 1));
                }
            }
        });
        return rows;
    };

    const activoRows = flatten(data.activo);
    const pasivoRows = flatten(data.patrimonioPasivo);

    const totalActivo = data.activo.reduce((acc, node) => acc + node.amount, 0);
    const totalPasivo = data.patrimonioPasivo.reduce((acc, node) => acc + node.amount, 0);

    // ASSETS
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('ASSETS', 14, startY);

    autoTable(doc, {
        startY: startY + 5,
        head: [['Item', 'Amount']],
        body: [
            ...activoRows.map(r => [
                { content: r.label, styles: { fontStyle: r.level === 0 ? 'bold' : 'normal' } },
                { content: formatCurrency(r.amount), styles: { halign: 'right', fontStyle: r.level === 0 ? 'bold' : 'normal' } }
            ]),
            [
                { content: 'TOTAL ASSETS', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
                { content: formatCurrency(totalActivo), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] } }
            ]
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: { 1: { cellWidth: 40 } }
    });

    // LIABILITIES & EQUITY (new page or below if it fits)
    let finalY = doc.lastAutoTable.finalY + 15;

    // Check if enough space, else new page
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.text("LIABILITIES & STOCKHOLDERS' EQUITY", 14, finalY);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Item', 'Amount']],
        body: [
            ...pasivoRows.map(r => [
                { content: r.label, styles: { fontStyle: r.level === 0 ? 'bold' : 'normal' } },
                { content: formatCurrency(r.amount), styles: { halign: 'right', fontStyle: r.level === 0 ? 'bold' : 'normal' } }
            ]),
            [
                { content: "TOTAL LIABILITIES & EQUITY", styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } },
                { content: formatCurrency(totalPasivo), styles: { fontStyle: 'bold', halign: 'right', fillColor: [254, 242, 242] } }
            ]
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: { 1: { cellWidth: 40 } }
    });
};

const generatePyGTable = (doc, data, startY) => {
    const tableData = data
        .filter(row => row) // Filter nulls
        .map(row => {
            const isTotal = row.isTotal;
            const isResult = row.id === 'NET_INCOME';

            return [
                {
                    content: row.label,
                    styles: {
                        fontStyle: isTotal ? 'bold' : 'normal',
                        fillColor: isResult ? [240, 253, 244] : (isTotal ? [248, 250, 252] : [255, 255, 255])
                    }
                },
                {
                    content: formatCurrency(row.amount),
                    styles: {
                        halign: 'right',
                        fontStyle: isTotal ? 'bold' : 'normal',
                        textColor: row.amount < 0 ? [239, 68, 68] : [0, 0, 0],
                        fillColor: isResult ? [240, 253, 244] : (isTotal ? [248, 250, 252] : [255, 255, 255])
                    }
                }
            ];
        });

    autoTable(doc, {
        startY: startY,
        head: [['Item', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 1: { cellWidth: 40 } }
    });
};
