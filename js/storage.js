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
  const obj = typeof data === 'object' ? data : { name: data };
  const p = {
    id: genId(),
    name: (obj.name || '').trim(),
    isRecurring:       !!obj.isRecurring,
    defaultCategory:   obj.defaultCategory || '',
    defaultAmount:     Number(obj.defaultAmount) || 0,
    payVia:            obj.payVia || '',
    website:           obj.website || '',
    appNote:           obj.appNote || '',
    userId:            obj.userId || '',
    passwordEnc:       obj.passwordEnc || null,
    twoFactorRequired: !!obj.twoFactorRequired,
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
    if (updates.name !== undefined)              payees[idx].name              = updates.name.trim();
    if (updates.isRecurring !== undefined)       payees[idx].isRecurring       = !!updates.isRecurring;
    if (updates.defaultCategory !== undefined)   payees[idx].defaultCategory   = updates.defaultCategory;
    if (updates.defaultAmount !== undefined)     payees[idx].defaultAmount     = Number(updates.defaultAmount) || 0;
    if (updates.payVia !== undefined)            payees[idx].payVia            = updates.payVia;
    if (updates.website !== undefined)           payees[idx].website           = updates.website;
    if (updates.appNote !== undefined)           payees[idx].appNote           = updates.appNote;
    if (updates.userId !== undefined)            payees[idx].userId            = updates.userId;
    if (updates.passwordEnc !== undefined) {
      payees[idx].passwordEnc = updates.passwordEnc;
      delete payees[idx].password; // drop any legacy plaintext
    }
    if (updates.twoFactorRequired !== undefined) payees[idx].twoFactorRequired = !!updates.twoFactorRequired;
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
// Passwords are AES-GCM encrypted at rest (non-extractable key in IndexedDB).
// The key itself is bound to the browser and cannot be exported, so the backup
// CANNOT contain the ciphertext and still be portable. Instead, at backup time
// we DECRYPT each password and write it in plain text into the backup JSON; at
// restore time we ENCRYPT it back with this browser's key.
//
// Consequence: the backup file is sensitive — anyone who reads it sees your
// saved passwords. Keep it private.
async function backupData() {
  try {
    const payees = getPayees();
    const exportPayees = await Promise.all(payees.map(async p => {
      const { passwordEnc, password, ...rest } = p;
      let plain = password || '';          // legacy plain field
      if (passwordEnc) {
        try { plain = await decryptSecret(passwordEnc); }
        catch {
          // Key unavailable — fall back to including the ciphertext so no data is lost.
          return { ...rest, passwordEnc };
        }
      }
      return plain ? { ...rest, password: plain } : rest;
    }));

    const data = {
      expenses: getExpenses(),
      payees: exportPayees,
      exportedAt: new Date().toISOString(),
      version: 5,
      notes: {
        passwords: exportPayees.some(p => p.password)
          ? 'Passwords are stored IN PLAIN TEXT in this backup to make cross-browser restore work. Keep this file private.'
          : 'No passwords stored.',
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `billpay-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    showToast('Backup failed: ' + err.message, 'error');
  }
}

async function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.expenses || !Array.isArray(data.expenses)) throw new Error('Invalid backup file');

    saveExpenses(data.expenses);

    let encryptedPwLost = 0;
    let encryptedPwCount = 0;
    let reEncryptedCount = 0;

    if (data.payees && Array.isArray(data.payees)) {
      const upgraded = await Promise.all(data.payees.map(async p => {
        const out = { ...p };

        // Newer backups (v5+): plaintext `password` — encrypt it for local storage.
        if (out.password) {
          try {
            out.passwordEnc = await encryptSecret(out.password);
            reEncryptedCount++;
          } catch (err) {
            console.warn('Re-encrypt failed for', out.name, err);
          }
          delete out.password;
        }
        // Older backups (v4): ciphertext `passwordEnc` from the originating browser.
        // Try to decrypt with this browser's key; if that fails, the password is lost.
        else if (out.passwordEnc) {
          encryptedPwCount++;
          try {
            const plain = await decryptSecret(out.passwordEnc);
            out.passwordEnc = await encryptSecret(plain); // refresh with current key
          } catch {
            encryptedPwLost++;
            out.passwordEnc = null; // mark as lost rather than keeping undecryptable blob
          }
        }
        return out;
      }));
      savePayees(upgraded);
    }

    event.target.value = '';
    refreshPayeeSelects();
    renderAll();

    if (encryptedPwLost > 0) {
      showToast(`Restored, but ${encryptedPwLost} encrypted password(s) from the original browser could not be decrypted here — edit those payees to re-enter.`, 'error');
    } else if (reEncryptedCount > 0) {
      showToast(`Data restored — ${reEncryptedCount} password(s) re-encrypted for this browser.`, 'success');
    } else {
      showToast('Data restored successfully!', 'success');
    }
  } catch (err) {
    showToast('Failed to restore: ' + err.message, 'error');
    event.target.value = '';
  }
}
