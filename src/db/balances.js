import { initDB } from './index';
import { getCuentas } from './index';
import { BALANCE_STRUCTURE, PYG_STRUCTURE } from './statements_us';
import { isExpense, isRevenue, RETAINED_EARNINGS } from './accountTypes';

// Lógica pura (sin BD) separada para poder testearla de forma aislada.

export const buildSumasYSaldos = (cuentas, apuntes) => {
    const balanceMap = {};

    cuentas.forEach(c => {
        balanceMap[c.codigo] = {
            cuenta: c,
            sumaDebe: 0,
            sumaHaber: 0
        };
    });

    apuntes.forEach(apunte => {
        if (balanceMap[apunte.cuenta_codigo]) {
            balanceMap[apunte.cuenta_codigo].sumaDebe += (apunte.debe || 0);
            balanceMap[apunte.cuenta_codigo].sumaHaber += (apunte.haber || 0);
        }
    });

    const balance = Object.values(balanceMap)
        .filter(item => item.sumaDebe !== 0 || item.sumaHaber !== 0) // Filtrar cuentas sin movimientos
        .map(item => {
            const saldo = item.sumaDebe - item.sumaHaber;
            return {
                codigo: item.cuenta.codigo,
                nombre: item.cuenta.nombre,
                sumaDebe: item.sumaDebe,
                sumaHaber: item.sumaHaber,
                saldoDeudor: saldo > 0 ? saldo : 0,
                saldoAcreedor: saldo < 0 ? Math.abs(saldo) : 0,
                saldoNeto: saldo // Positivo = Deudor, Negativo = Acreedor
            };
        });

    return balance.sort((a, b) => a.codigo.localeCompare(b.codigo));
};

export const getSumasYSaldos = async (ejercicioId) => {
    const db = await initDB();

    const [cuentas, apuntes] = await Promise.all([
        getCuentas(ejercicioId),
        db.getAllFromIndex('apuntes', 'ejercicio_id', ejercicioId)
    ]);

    return buildSumasYSaldos(cuentas, apuntes);
};

// Recolecta las hojas (nodos con lista 'accounts') en orden de aparición.
const collectLeaves = (nodes, leaves = []) => {
    nodes.forEach(node => {
        if (node.children) {
            collectLeaves(node.children, leaves);
        } else if (node.accounts) {
            leaves.push(node);
        }
    });
    return leaves;
};

// Asigna cada cuenta a UN único epígrafe: gana el prefijo coincidente más largo
// de toda la estructura (en empate, el primer epígrafe en orden de aparición).
// Evita el doble cómputo de cuentas que coinciden con prefijos de varios
// epígrafes (ej. la 241 coincide con '241' y con '24').
export const assignAccountsToLeaves = (balanceList, leaves) => {
    const assignment = {}; // codigo -> id de hoja

    balanceList.forEach(acc => {
        let bestId = null;
        let bestLen = 0;

        leaves.forEach(leaf => {
            leaf.accounts.forEach(prefix => {
                if (prefix.length > bestLen && acc.codigo.startsWith(prefix)) {
                    bestId = leaf.id;
                    bestLen = prefix.length;
                }
            });
        });

        if (bestId) assignment[acc.codigo] = bestId;
    });

    return assignment;
};

// Suma saldoNeto por hoja según la asignación única.
const sumByLeaf = (balanceList, assignment) => {
    const sums = {};
    balanceList.forEach(acc => {
        const leafId = assignment[acc.codigo];
        if (leafId) {
            sums[leafId] = (sums[leafId] || 0) + acc.saldoNeto;
        }
    });
    return sums;
};

// Rellena la estructura del Balance con los importes ya agregados por hoja.
const populateNode = (node, sumsByLeafId) => {
    const result = { ...node };

    if (result.children) {
        result.children = result.children.map(child => populateNode(child, sumsByLeafId));
        result.amount = result.children.reduce((acc, child) => acc + child.amount, 0);
    } else {
        result.amount = sumsByLeafId[node.id] || 0;
    }

    return result;
};

export const computeBalanceSituacion = (balanceListInput) => {
    // Copia para no mutar la lista del llamante al inyectar el resultado en la 129
    const balanceList = balanceListInput.map(acc => ({ ...acc }));

    // --- SIMULATED CLOSING ---
    // Net income = Revenue - Expenses. In terms of saldoNeto (Debit - Credit):
    // Net income = - (saldoNeto of revenue + expense accounts).
    let resultadoEjercicio = 0;
    balanceList.forEach(acc => {
        if (isExpense(acc.codigo) || isRevenue(acc.codigo)) {
            resultadoEjercicio -= acc.saldoNeto;
        }
    });

    // Fold the net income into Retained Earnings so the balance sheet balances
    // before the closing entries are posted (US GAAP: net income flows to RE).
    // Profit -> credit (saldoNeto negative); loss -> debit (saldoNeto positive).
    const retainedEarnings = balanceList.find(acc => acc.codigo === RETAINED_EARNINGS);
    if (retainedEarnings) {
        retainedEarnings.saldoNeto -= resultadoEjercicio;
        if (retainedEarnings.saldoNeto > 0) {
            retainedEarnings.saldoDeudor = retainedEarnings.saldoNeto;
            retainedEarnings.saldoAcreedor = 0;
        } else {
            retainedEarnings.saldoDeudor = 0;
            retainedEarnings.saldoAcreedor = Math.abs(retainedEarnings.saldoNeto);
        }
    } else {
        balanceList.push({
            codigo: RETAINED_EARNINGS,
            nombre: 'Retained Earnings (simulated)',
            sumaDebe: 0,
            sumaHaber: 0,
            saldoDeudor: resultadoEjercicio < 0 ? Math.abs(resultadoEjercicio) : 0, // loss is a debit
            saldoAcreedor: resultadoEjercicio > 0 ? resultadoEjercicio : 0, // profit is a credit
            saldoNeto: -resultadoEjercicio
        });
    }
    // -------------------------

    // One account -> one line across the WHOLE structure (assets and
    // liabilities/equity together) so a code never shows up on both sides.
    const leaves = collectLeaves([
        ...BALANCE_STRUCTURE.activo,
        ...BALANCE_STRUCTURE.patrimonio_pasivo
    ]);
    const assignment = assignAccountsToLeaves(balanceList, leaves);
    const sums = sumByLeaf(balanceList, assignment);

    const activo = BALANCE_STRUCTURE.activo.map(node => populateNode(node, sums));

    // Liabilities and equity carry a natural credit balance (saldoNeto negative):
    // flip the sign so they display as positive amounts.
    const patrimonioPasivo = BALANCE_STRUCTURE.patrimonio_pasivo.map(node => {
        const populated = populateNode(node, sums);
        const invertSign = (n) => {
            n.amount = -n.amount || 0; // '|| 0' evita el -0
            if (n.children) n.children.forEach(invertSign);
        };
        invertSign(populated);
        return populated;
    });

    return { activo, patrimonioPasivo };
};

export const getBalanceSituacion = async (ejercicioId) => {
    const balanceList = await getSumasYSaldos(ejercicioId);
    return computeBalanceSituacion(balanceList);
};

export const computeCuentaResultados = (balanceList) => {
    // Single assignment in the income statement too: keeps an account out of two
    // lines (longest-prefix wins, e.g. '6200' Interest Expense over a '60' bucket).
    const rows = PYG_STRUCTURE.filter(row => !row.isTotal);
    const assignment = assignAccountsToLeaves(balanceList, rows);
    const sums = sumByLeaf(balanceList, assignment);

    const calculatedRows = {};

    rows.forEach(row => {
        // saldoNeto is (Debit - Credit); the impact on income is the opposite:
        // credits (revenue) raise income, debits (expenses) reduce it.
        const impact = -(sums[row.id] || 0) || 0; // trailing '|| 0' avoids -0
        calculatedRows[row.id] = { ...row, amount: impact };
    });

    // Totales: dependen de filas anteriores en el orden de la estructura.
    return PYG_STRUCTURE.map(row => {
        if (row.isTotal) {
            const sum = row.sumIds.reduce((acc, id) => {
                const val = calculatedRows[id] ? calculatedRows[id].amount : 0;
                return acc + val;
            }, 0);

            calculatedRows[row.id] = { ...row, amount: sum };
            return calculatedRows[row.id];
        }

        return calculatedRows[row.id];
    });
};

export const getCuentaResultados = async (ejercicioId) => {
    const balanceList = await getSumasYSaldos(ejercicioId);
    return computeCuentaResultados(balanceList);
};
