const STORAGE_KEY  = 'local_expenses_v1';
const PAYEES_KEY   = 'local_billpay_payees_v1';
const CATS_KEY     = 'local_billpay_cats_v1';

function genId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Bills ─────────────────────────────────────────────────────────────────────
function getExpenses() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveExpenses(expenses) { localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); }

function addExpense(expense) {
  const expenses = getExpenses();
  expense.id = genId();
  expense.createdAt = Date.now();
  expenses.push(expense);
  saveExpenses(expenses);
  return expense;
}
function updateExpense(id, updates) {
  const expenses = getExpenses();
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return null;
  expenses[idx] = { ...expenses[idx], ...updates };
  saveExpenses(expenses);
  return expenses[idx];
}
function deleteExpense(id) { saveExpenses(getExpenses().filter(e => e.id !== id)); }

// ── Payees ────────────────────────────────────────────────────────────────────
function getPayees() {
  try { return JSON.parse(localStorage.getItem(PAYEES_KEY)) || []; }
  catch { return []; }
}
function savePayees(p) { localStorage.setItem(PAYEES_KEY, JSON.stringify(p)); }

function addPayee(data) {
  const payees = getPayees();
  const name = typeof data === 'string' ? data : data.name;
  const p = {
    id: genId(),
    name: name.trim(),
    isRecurring:     typeof data === 'object' ? !!data.isRecurring     : false,
    defaultCategory: typeof data === 'object' ? (data.defaultCategory || '') : '',
    defaultAmount:   typeof data === 'object' ? (Number(data.defaultAmount) || 0) : 0,
    createdAt: Date.now(),
  };
  payees.push(p);
  savePayees(payees);
  return p;
}
function updatePayee(id, updates) {
  const payees = getPayees();
  const idx = payees.findIndex(p => p.id === id);
  if (idx === -1) return;
  // Accept either a plain string (legacy) or an updates object
  if (typeof updates === 'string') {
    payees[idx].name = updates.trim();
  } else {
    if (updates.name !== undefined)            payees[idx].name            = updates.name.trim();
    if (updates.isRecurring !== undefined)     payees[idx].isRecurring     = !!updates.isRecurring;
    if (updates.defaultCategory !== undefined) payees[idx].defaultCategory = updates.defaultCategory;
    if (updates.defaultAmount !== undefined)   payees[idx].defaultAmount   = Number(updates.defaultAmount) || 0;
  }
  savePayees(payees);
}
function deletePayee(id) { savePayees(getPayees().filter(p => p.id !== id)); }

// ── Categories ────────────────────────────────────────────────────────────────
function getCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem(CATS_KEY));
    if (stored && stored.length) return stored;
  } catch {}
  return [];
}
function saveCategories(cats) { localStorage.setItem(CATS_KEY, JSON.stringify(cats)); }

function addCategory(cat) {
  const cats = getCategories();
  cat.id = genId();
  cat.createdAt = Date.now();
  cats.push(cat);
  saveCategories(cats);
  return cat;
}
function updateCategory(id, updates) {
  const cats = getCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) return;
  cats[idx] = { ...cats[idx], ...updates };
  saveCategories(cats);
}
function deleteCategory(id) { saveCategories(getCategories().filter(c => c.id !== id)); }

// ── Backup / Restore ──────────────────────────────────────────────────────────
function backupData() {
  const data = {
    expenses: getExpenses(),
    payees: getPayees(),
    exportedAt: new Date().toISOString(),
    version: 3,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `billpay-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.expenses || !Array.isArray(data.expenses)) throw new Error('Invalid backup file');
      saveExpenses(data.expenses);
      if (data.payees && Array.isArray(data.payees)) savePayees(data.payees);
      event.target.value = '';
      refreshPayeeSelects();
      renderAll();
      showToast('Data restored successfully!', 'success');
    } catch (err) {
      showToast('Failed to restore: ' + err.message, 'error');
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}
