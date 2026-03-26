let editingId = null;
let formTags = [];
let dayModalDate = null;

// ─── Bulk Add Bills (grid) ────────────────────────────────────────────────────

function openBulkAddModal(dateStr) {
  buildBulkGrid(dateStr || todayStr());
  document.getElementById('bulk-add-overlay').style.display = 'flex';
}

function closeBulkAddModal() {
  document.getElementById('bulk-add-overlay').style.display = 'none';
}

function buildBulkGrid(dateStr) {
  const recurring = getPayees()
    .filter(p => p.isRecurring)
    .sort((a, b) => a.name.localeCompare(b.name));

  const tbody = document.getElementById('bulk-grid-body');
  if (!recurring.length) {
    tbody.innerHTML = `
      <tr><td colspan="5" class="bulk-empty">
        No recurring payees set up yet.
        <button class="link-btn" onclick="closeBulkAddModal();openManageModal();">Go to Manage →</button>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = recurring.map(p => buildFixedRow(p, dateStr)).join('');
}

function buildFixedRow(payee, dateStr) {
  return `
    <tr class="bulk-row">
      <td class="col-check"><input type="checkbox" class="row-check" checked></td>
      <td class="col-payee">
        <span class="grid-payee-label">${payee.name}</span>
        <input type="hidden" class="row-payee" value="${payee.name}">
      </td>
      <td class="col-amount">
        <input type="number" class="row-amount grid-input" placeholder="0.00"
               step="0.01" min="0" value="${payee.defaultAmount || ''}">
      </td>
      <td class="col-date">
        <input type="date" class="row-date grid-input" value="${dateStr || ''}">
      </td>
      <td class="col-notes">
        <input type="text" class="row-notes grid-input" placeholder="Notes...">
      </td>
      <td class="col-del"></td>
    </tr>`;
}

function addBulkRow() {
  const allPayees = getPayees().sort((a, b) => a.name.localeCompare(b.name));
  const payeeOpts = allPayees.map(p =>
    `<option value="${p.name}">${p.isRecurring ? '🔄 ' : ''}${p.name}</option>`
  ).join('');

  const tr = document.createElement('tr');
  tr.className = 'bulk-row';
  tr.innerHTML = `
    <td class="col-check"><input type="checkbox" class="row-check" checked></td>
    <td class="col-payee">
      <select class="row-payee grid-select">
        <option value="">Select payee...</option>
        ${payeeOpts}
      </select>
    </td>
    <td class="col-amount">
      <input type="number" class="row-amount grid-input" placeholder="0.00" step="0.01" min="0">
    </td>
    <td class="col-date">
      <input type="date" class="row-date grid-input" value="${todayStr()}">
    </td>
    <td class="col-notes">
      <input type="text" class="row-notes grid-input" placeholder="Notes...">
    </td>
    <td class="col-del">
      <button class="icon-btn del-btn" onclick="this.closest('tr').remove()" title="Remove">✕</button>
    </td>`;
  document.getElementById('bulk-grid-body').appendChild(tr);
}


function saveBulkAddForm() {
  const rows   = document.querySelectorAll('#bulk-grid-body .bulk-row');
  const bills  = [];

  for (const row of rows) {
    const checked = row.querySelector('.row-check').checked;
    if (!checked) continue;

    const payeeEl = row.querySelector('.row-payee');
    const payee   = payeeEl.value.trim();
    const amount  = parseFloat(row.querySelector('.row-amount').value);
    const date    = row.querySelector('.row-date').value;
    const notes   = row.querySelector('.row-notes').value.trim();

    if (!payee)                          { showToast('Select a payee for all checked rows', 'error'); return; }
    if (isNaN(amount) || amount <= 0)    { showToast(`Enter a valid amount for "${payee}"`, 'error'); return; }
    if (!date)                           { showToast(`Select a date for "${payee}"`, 'error'); return; }

    bills.push({ date, description: payee, payee, amount, category: '', notes,
                 isSubscription: false, frequency: null, tags: [] });
  }

  if (!bills.length) { showToast('No payees checked to save', 'error'); return; }

  bills.forEach(b => addExpense(b));
  closeBulkAddModal();
  renderAll();
  showToast(`${bills.length} bill${bills.length > 1 ? 's' : ''} saved!`, 'success');
}

// ─── Single Bill (Add/Edit) form ──────────────────────────────────────────────
// Used for: Edit existing bill, and "+ Add Subscription" flow

function openAddModal(isSubscription = false) {
  editingId = null;
  resetForm();
  document.getElementById('modal-title').textContent = 'Add Bill';
  document.getElementById('f-date').value = todayStr();
  if (isSubscription) {
    document.getElementById('f-subscription').checked = true;
    onSubscriptionChange();
  }
  document.getElementById('expense-overlay').style.display = 'flex';
}

function openEditModal(id) {
  const expense = getExpenses().find(e => e.id === id);
  if (!expense) return;
  editingId = id;
  resetForm();
  document.getElementById('modal-title').textContent = 'Edit Bill';
  document.getElementById('f-date').value        = expense.date || '';
  document.getElementById('f-description').value = expense.description || '';
  document.getElementById('f-amount').value      = expense.amount || '';
  document.getElementById('f-payee').value       = expense.payee || expense.paymentMethod || '';
  document.getElementById('f-subscription').checked = !!expense.isSubscription;
  document.getElementById('f-frequency').value   = expense.frequency || 'monthly';
  document.getElementById('f-notes').value       = expense.notes || '';
  formTags = [...(expense.tags || [])];
  renderFormTags();
  onSubscriptionChange();
  document.getElementById('expense-overlay').style.display = 'flex';
}

function closeExpenseModal() {
  document.getElementById('expense-overlay').style.display = 'none';
  editingId = null;
}

function resetForm() {
  document.getElementById('expense-form').reset();
  formTags = [];
  renderFormTags();
  document.getElementById('f-freq-row').style.display = 'none';
}

function onSubscriptionChange() {
  const checked = document.getElementById('f-subscription').checked;
  document.getElementById('f-freq-row').style.display = checked ? 'flex' : 'none';
}

// ─── Tags ──────────────────────────────────────────────────────────────────────

function addFormTag() {
  const input = document.getElementById('f-new-tag');
  const tag   = input.value.trim();
  if (tag && !formTags.includes(tag)) { formTags.push(tag); renderFormTags(); }
  input.value = '';
  input.focus();
}

function removeFormTag(tag) {
  formTags = formTags.filter(t => t !== tag);
  renderFormTags();
}

function renderFormTags() {
  document.getElementById('f-tags-list').innerHTML = formTags.map(t =>
    `<span class="tag-chip removable">${t}<button type="button" class="tag-remove" onclick="removeFormTag('${t}')">✕</button></span>`
  ).join('');
}

// ─── Save single bill ──────────────────────────────────────────────────────────

function saveExpenseForm() {
  const date        = document.getElementById('f-date').value;
  const description = document.getElementById('f-description').value.trim();
  const amount      = parseFloat(document.getElementById('f-amount').value);
  const payee       = document.getElementById('f-payee').value.trim();
  const isSubscription = document.getElementById('f-subscription').checked;
  const frequency   = isSubscription ? document.getElementById('f-frequency').value : null;
  const notes       = document.getElementById('f-notes').value.trim();

  if (!date)                        { showToast('Please select a date', 'error'); return; }
  if (!description)                 { showToast('Please enter a description', 'error'); return; }
  if (isNaN(amount) || amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }

  const expense = { date, description, amount, payee, isSubscription, frequency, notes, tags: formTags };

  if (editingId) {
    updateExpense(editingId, expense);
    showToast('Bill updated!', 'success');
  } else {
    addExpense(expense);
    showToast('Bill added!', 'success');
  }

  closeExpenseModal();
  renderAll();
}

function confirmDelete(id) {
  if (confirm('Delete this bill?')) {
    deleteExpense(id);
    showToast('Bill deleted', 'info');
    renderAll();
  }
}

// ─── Day Modal ─────────────────────────────────────────────────────────────────

function showDayModal(dateStr, expenses) {
  dayModalDate = dateStr;
  document.getElementById('day-modal-title').textContent = formatDate(dateStr);
  renderDayModalContent(dateStr, expenses);
  document.getElementById('day-overlay').style.display = 'flex';
}

function renderDayModalContent(dateStr, expenses) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  document.getElementById('day-modal-total').textContent = total > 0 ? formatCurrency(total) + ' total' : '';

  const list = document.getElementById('day-expense-list');
  if (!expenses.length) {
    list.innerHTML = `<div class="empty-state-sm">No bills for this day.</div>`;
    return;
  }

  list.innerHTML = expenses.map(e => {
    const payeeStr = e.payee || e.paymentMethod || '';
    return `
      <div class="day-expense-row">
        <div class="day-exp-info">
          <div class="day-exp-desc">${e.description || '—'}</div>
          <div class="day-exp-meta">${payeeStr}${(e.tags||[]).length ? (payeeStr ? ' · ' : '') + e.tags.join(', ') : ''}</div>
          ${e.notes ? `<div class="day-exp-notes">${e.notes}</div>` : ''}
        </div>
        <div class="day-exp-amount">${formatCurrency(e.amount)}</div>
        <div class="day-exp-actions">
          <button class="icon-btn edit-btn" onclick="openEditModal('${e.id}');closeDayModal();" title="Edit">✎</button>
          <button class="icon-btn del-btn"  onclick="confirmDeleteFromDay('${e.id}','${dateStr}')" title="Delete">✕</button>
        </div>
      </div>`;
  }).join('');
}

function confirmDeleteFromDay(id, dateStr) {
  if (confirm('Delete this bill?')) {
    deleteExpense(id);
    showToast('Bill deleted', 'info');
    renderAll();
    const remaining = getExpenses().filter(e => e.date === dateStr);
    renderDayModalContent(dateStr, remaining);
  }
}

function closeDayModal() {
  document.getElementById('day-overlay').style.display = 'none';
  dayModalDate = null;
}

function addExpenseFromDay() {
  const date = dayModalDate;
  closeDayModal();
  openBulkAddModal(date);
}
