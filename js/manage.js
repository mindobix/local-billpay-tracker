function openManageModal() {
  renderManagePayees();
  document.getElementById('manage-overlay').style.display = 'flex';
}

function closeManageModal() {
  document.getElementById('manage-overlay').style.display = 'none';
}

// ── Payees ────────────────────────────────────────────────────────────────────

function renderManagePayees() {
  const payees = getPayees().sort((a, b) => a.name.localeCompare(b.name));
  const container = document.getElementById('manage-payees-list');

  if (!payees.length) {
    container.innerHTML = `<div class="manage-empty">No payees yet. Add one below.</div>`;
    return;
  }

  container.innerHTML = payees.map(p => `
      <div class="manage-row" id="pr-${p.id}">
        ${p.isRecurring ? `<span class="recur-badge" title="Recurring">🔄</span>` : `<span class="recur-badge recur-off" title="One-off">—</span>`}
        <div class="manage-row-name">${escHtml(p.name)}</div>
        ${p.defaultAmount ? `<span class="manage-default-amt">$${Number(p.defaultAmount).toFixed(2)}</span>` : ''}
        <div class="manage-row-actions">
          <button class="icon-btn edit-btn" onclick="editPayee('${p.id}')" title="Edit">✎</button>
          <button class="icon-btn del-btn" onclick="removePayee('${p.id}')" title="Delete">✕</button>
        </div>
      </div>`
  ).join('');
}

function editPayee(id) {
  const payee = getPayees().find(p => p.id === id);
  if (!payee) return;

  document.getElementById(`pr-${id}`).innerHTML = `
    <div class="manage-edit-block">
      <div class="manage-edit-r1">
        <input class="manage-edit-input" id="pe-name-${id}" value="${escHtml(payee.name)}"
               placeholder="Payee name"
               onkeydown="if(event.key==='Escape')renderManagePayees();">
        <label class="manage-recur-label">
          <input type="checkbox" id="pe-recur-${id}" ${payee.isRecurring ? 'checked' : ''}> Recurring
        </label>
        <input type="number" class="manage-edit-input manage-amt-input" id="pe-amt-${id}"
               placeholder="Default $" value="${payee.defaultAmount || ''}" min="0" step="0.01">
        <button class="btn btn-primary" style="padding:5px 12px;font-size:12px" onclick="savePayeeEdit('${id}')">Save</button>
        <button class="btn btn-ghost"   style="padding:5px 10px;font-size:12px" onclick="renderManagePayees()">Cancel</button>
      </div>
    </div>`;
  document.getElementById(`pe-name-${id}`).focus();
}

function savePayeeEdit(id) {
  const name        = document.getElementById(`pe-name-${id}`).value.trim();
  const isRecurring = document.getElementById(`pe-recur-${id}`).checked;
  const defaultAmount = parseFloat(document.getElementById(`pe-amt-${id}`).value) || 0;

  if (!name) { showToast('Payee name cannot be empty', 'error'); return; }
  updatePayee(id, { name, isRecurring, defaultAmount });
  renderManagePayees();
  refreshPayeeSelects();
  showToast('Payee updated', 'success');
}

function removePayee(id) {
  if (confirm('Delete this payee? Bills using it will not be affected.')) {
    deletePayee(id);
    renderManagePayees();
    refreshPayeeSelects();
    showToast('Payee deleted', 'info');
  }
}

function addNewPayee() {
  const input = document.getElementById('new-payee-input');
  const name  = input.value.trim();
  if (!name) { showToast('Enter a payee name', 'error'); return; }
  const dup = getPayees().find(p => p.name.toLowerCase() === name.toLowerCase());
  if (dup) { showToast('Payee already exists', 'error'); return; }

  const isRecurring = document.getElementById('new-payee-recur').checked;
  addPayee({ name, isRecurring });
  input.value = '';
  document.getElementById('new-payee-recur').checked = false;
  input.focus();
  renderManagePayees();
  refreshPayeeSelects();
  showToast('Payee added', 'success');
}

// ── Utility ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
