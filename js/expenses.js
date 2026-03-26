let sortKey = 'date';
let sortDir = -1;

function renderExpenses() {
  const allExpenses = getExpenses();
  const filtered = applyFilters(allExpenses);

  filtered.sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'amount') { av = Number(av); bv = Number(bv); }
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });

  const tbody = document.getElementById('expenses-body');
  const countEl = document.getElementById('expenses-count');

  if (countEl) countEl.textContent = `${filtered.length} bill${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No bills found. <button class="link-btn" onclick="openAddModal()">Add one?</button></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    const tags = (e.tags || []).map(t => `<span class="tag-chip">${t}</span>`).join('');
    const freqLabel = e.frequency === 'yearly' ? '/yr' : e.frequency === 'weekly' ? '/wk' : '/mo';
    return `
      <tr>
        <td class="date-cell">${formatDate(e.date)}</td>
        <td>
          <div class="expense-desc-wrap">
            <span class="expense-desc">${e.description || '—'}</span>
            ${e.isSubscription ? `<span class="sub-badge">🔄 ${e.frequency || 'sub'}${freqLabel}</span>` : ''}
          </div>
          ${e.notes ? `<div class="expense-notes">${e.notes}</div>` : ''}
        </td>
        <td class="amount-cell">${formatCurrency(e.amount)}</td>
        <td class="text-muted">${e.payee || e.paymentMethod || '—'}</td>
        <td class="tags-cell">${tags || '<span class="text-dim">—</span>'}</td>
        <td class="actions-cell">
          <button class="icon-btn edit-btn" onclick="openEditModal('${e.id}')" title="Edit">✎</button>
          <button class="icon-btn del-btn" onclick="confirmDelete('${e.id}')" title="Delete">✕</button>
        </td>
      </tr>`;
  }).join('');
}

function sortBy(key) {
  if (sortKey === key) sortDir *= -1;
  else { sortKey = key; sortDir = -1; }
  // Update sort indicators
  document.querySelectorAll('.sort-indicator').forEach(el => el.textContent = '↕');
  const indicator = document.getElementById(`sort-${key}`);
  if (indicator) indicator.textContent = sortDir === 1 ? '↑' : '↓';
  renderExpenses();
}
