let reportFrom = '';
let reportTo   = '';

// ── Init / entry ──────────────────────────────────────────────────────────────

function initReports() {
  if (reportFrom && reportTo) return; // already initialised
  const now  = new Date();
  reportTo   = monthKey(now.getFullYear(), now.getMonth());
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  reportFrom = monthKey(from.getFullYear(), from.getMonth());
  document.getElementById('report-from').value = reportFrom;
  document.getElementById('report-to').value   = reportTo;
}

function onReportRangeChange() {
  reportFrom = document.getElementById('report-from').value;
  reportTo   = document.getElementById('report-to').value;
  if (reportFrom && reportTo && reportFrom > reportTo) {
    reportTo = reportFrom;
    document.getElementById('report-to').value = reportTo;
  }
  renderReports();
}

// ── Core render ───────────────────────────────────────────────────────────────

function renderReports() {
  initReports();

  const subFilter = document.getElementById('report-subscription').value;
  const recurFilter = document.getElementById('report-recurring').value;
  const recurringNames = recurFilter !== 'all'
    ? new Set(getPayees().filter(p => p.isRecurring).map(p => p.name))
    : null;

  const expenses = getExpenses().filter(e => {
    if (!e.date) return false;
    const mk = e.date.slice(0, 7);
    if (mk < reportFrom || mk > reportTo) return false;
    if (subFilter === 'exclude' && e.isSubscription) return false;
    if (subFilter === 'only' && !e.isSubscription) return false;
    if (recurFilter === 'recurring'    && !recurringNames.has(e.payee || e.paymentMethod || '')) return false;
    if (recurFilter === 'nonrecurring' &&  recurringNames.has(e.payee || e.paymentMethod || '')) return false;
    return true;
  });

  const container = document.getElementById('report-table-container');

  // Build sorted month list
  const months = buildMonthRange(reportFrom, reportTo);

  // Collect unique payees from filtered expenses (sorted A→Z)
  const payeeSet = new Set();
  expenses.forEach(e => { if (e.payee || e.paymentMethod) payeeSet.add(e.payee || e.paymentMethod); });
  const payees = [...payeeSet].sort((a, b) => a.localeCompare(b));

  if (!months.length || !payees.length) {
    container.innerHTML = `<div class="report-empty">No bills found for the selected range.</div>`;
    return;
  }

  // Build lookup: month → payee → total
  const lookup = {};
  expenses.forEach(e => {
    const mk    = e.date.slice(0, 7);
    const payee = e.payee || e.paymentMethod || '';
    if (!lookup[mk]) lookup[mk] = {};
    lookup[mk][payee] = (lookup[mk][payee] || 0) + Number(e.amount);
  });

  // Column totals (per payee across all months)
  const colTotals = {};
  payees.forEach(p => {
    colTotals[p] = months.reduce((s, mk) => s + ((lookup[mk] && lookup[mk][p]) || 0), 0);
  });

  // Grand total
  const grandTotal = payees.reduce((s, p) => s + colTotals[p], 0);

  // ── Build table ────────────────────────────────────────────────────────────

  let html = `<div class="report-wrap"><table class="report-table">`;

  // Header row
  html += `<thead><tr>
    <th class="report-th-month">Month</th>
    <th class="report-th-total">Total</th>
    ${payees.map(p => `<th class="report-th-payee" title="${escReportHtml(p)}">${escReportHtml(p)}</th>`).join('')}
  </tr></thead>`;

  // Data rows
  html += `<tbody>`;
  months.forEach(mk => {
    const rowTotal = payees.reduce((s, p) => s + ((lookup[mk] && lookup[mk][p]) || 0), 0);
    html += `<tr>
      <td class="report-td-month">${formatMonthLabel(mk)}</td>
      <td class="report-td-rowtotal">${rowTotal !== 0 ? formatCurrency(rowTotal) : '—'}</td>
      ${payees.map(p => {
        const val = lookup[mk] && lookup[mk][p] != null ? lookup[mk][p] : null;
        return val !== null
          ? `<td class="report-td-amt has-value">${formatCurrency(val)}</td>`
          : `<td class="report-td-amt">—</td>`;
      }).join('')}
    </tr>`;
  });

  // Totals footer row
  html += `<tr class="report-tr-totals">
    <td class="report-td-month">Total</td>
    <td class="report-td-rowtotal report-td-grandtotal">${formatCurrency(grandTotal)}</td>
    ${payees.map(p => `<td class="report-td-amt report-td-coltotal">${colTotals[p] !== 0 ? formatCurrency(colTotals[p]) : '—'}</td>`).join('')}
  </tr>`;

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function buildMonthRange(from, to) {
  const months = [];
  let [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (fy < ty || (fy === ty && fm <= tm)) {
    months.push(monthKey(fy, fm - 1));
    fm++;
    if (fm > 12) { fm = 1; fy++; }
  }
  return months;
}

function formatMonthLabel(mk) {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function escReportHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
