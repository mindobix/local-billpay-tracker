// ── Payees ────────────────────────────────────────────────────────────────────

let _currentEditId = null;
let _editResizeHandler = null;

// Insert the edit panel into the grid right after the LAST card in the active
// card's row. This keeps all row-mates in place; only rows below shift down.
function insertEditPanelInRow(panel, card) {
  let anchor = card;
  let next = anchor.nextElementSibling;
  while (
    next &&
    next.classList.contains('payee-card') &&
    next.offsetTop === card.offsetTop
  ) {
    anchor = next;
    next = anchor.nextElementSibling;
  }
  anchor.insertAdjacentElement('afterend', panel);
}

// Re-anchor the panel when the viewport resizes (column count may change).
function repositionEditPanel() {
  if (!_currentEditId) return;
  const card  = document.getElementById(`pr-${_currentEditId}`);
  const panel = document.getElementById(`pe-panel-${_currentEditId}`);
  if (!card || !panel) return;
  panel.remove();
  insertEditPanelInRow(panel, card);
}

function closeCurrentEdit() {
  if (!_currentEditId) return;
  const card  = document.getElementById(`pr-${_currentEditId}`);
  const panel = document.getElementById(`pe-panel-${_currentEditId}`);
  if (card)  card.classList.remove('payee-card-active');
  if (panel) panel.remove();
  if (_editResizeHandler) {
    window.removeEventListener('resize', _editResizeHandler);
    _editResizeHandler = null;
  }
  _currentEditId = null;
}

const PAYEE_AVATAR_PALETTE = [
  ['#6366f1', '#a5b4fc'],
  ['#10b981', '#6ee7b7'],
  ['#f59e0b', '#fcd34d'],
  ['#ec4899', '#f9a8d4'],
  ['#06b6d4', '#67e8f9'],
  ['#8b5cf6', '#c4b5fd'],
  ['#ef4444', '#fca5a5'],
  ['#14b8a6', '#5eead4'],
];

function payeeAvatarStyle(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const [a, b] = PAYEE_AVATAR_PALETTE[Math.abs(h) % PAYEE_AVATAR_PALETTE.length];
  return `background: linear-gradient(135deg, ${a}, ${b});`;
}

function payeeInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderManagePayees() {
  _currentEditId = null; // DOM will be replaced

  const searchEl = document.getElementById('payees-search');
  const q = (searchEl?.value || '').trim().toLowerCase();

  const all = getPayees().sort((a, b) => a.name.localeCompare(b.name));
  const payees = q ? all.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.userId || '').toLowerCase().includes(q) ||
    (p.appNote || '').toLowerCase().includes(q)
  ) : all;

  const container = document.getElementById('manage-payees-list');

  if (!all.length) {
    container.innerHTML = `
      <div class="payees-empty">
        <div class="payees-empty-icon">👥</div>
        <div class="payees-empty-title">No payees yet</div>
        <div class="payees-empty-sub">Add your first payee using the bar above.</div>
      </div>`;
    return;
  }
  if (!payees.length) {
    container.innerHTML = `
      <div class="payees-empty">
        <div class="payees-empty-icon">🔎</div>
        <div class="payees-empty-title">No matches</div>
        <div class="payees-empty-sub">Try a different search.</div>
      </div>`;
    return;
  }

  container.innerHTML = payees.map(p => payeeCardHtml(p)).join('');
}

function payeeCardHtml(p) {
  const payViaLabel = p.payVia === 'website'   ? '🌐 Website'
                    : p.payVia === 'mobileApp' ? '📱 Mobile App'
                    : '';

  const recurBadge = p.isRecurring
    ? `<span class="payee-recur-badge" title="Recurring">🔄 Recurring</span>`
    : `<span class="payee-recur-badge payee-recur-off" title="One-off">One-off</span>`;

  const hasPassword = !!(p.passwordEnc || p.password);
  const rows = [];
  if (payViaLabel) {
    rows.push(detailRow('💳', 'Pay via', `<span class="payee-detail-strong">${payViaLabel}</span>`));
  }
  const safeUrl = sanitizeUrl(p.website);
  if (safeUrl) {
    rows.push(detailRow(
      '🔗',
      'Website',
      `<a class="payee-link" href="${escHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escHtml(p.name)} website ↗</a>`
    ));
  }
  if (p.appNote) {
    rows.push(detailRow('📝', 'App / phone', escHtml(p.appNote)));
  }
  if (p.userId) {
    rows.push(detailRow('👤', 'User ID', `<span class="payee-detail-mono">${escHtml(p.userId)}</span>`));
  }
  if (hasPassword) {
    const badge = p.passwordEnc
      ? `<span class="payee-badge payee-badge-enc" title="Encrypted with a non-extractable AES-GCM key (IndexedDB)">🔒 Encrypted</span>`
      : `<span class="payee-badge payee-badge-warn" title="Stored as plain text — edit & save to encrypt">⚠ Plain text</span>`;
    rows.push(detailRow('🔑', 'Password', badge));
  }
  rows.push(detailRow(
    '🔐',
    'Two-factor',
    p.twoFactorRequired
      ? `<span class="payee-badge payee-badge-on">Required</span>`
      : `<span class="payee-badge payee-badge-off">Not required</span>`
  ));

  const amount = p.defaultAmount
    ? `<div class="payee-amount"><span class="payee-amount-label">Default amount</span><span class="payee-amount-value">$${Number(p.defaultAmount).toFixed(2)}</span></div>`
    : `<div class="payee-amount payee-amount-none"><span class="payee-amount-label">Default amount</span><span class="payee-amount-empty">— not set —</span></div>`;

  return `
    <div class="payee-card" id="pr-${p.id}">
      <div class="payee-card-head">
        <div class="payee-avatar" style="${payeeAvatarStyle(p.name)}">${escHtml(payeeInitials(p.name))}</div>
        <div class="payee-head-text">
          <div class="payee-name">${escHtml(p.name)}</div>
          <div class="payee-head-sub">${recurBadge}</div>
        </div>
        <div class="payee-card-actions">
          <button class="icon-btn edit-btn" onclick="editPayee('${p.id}')" title="Edit">✎</button>
          <button class="icon-btn del-btn" onclick="removePayee('${p.id}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="payee-details">${rows.join('')}</div>
      ${amount}
    </div>`;
}

function detailRow(icon, label, valueHtml) {
  return `
    <div class="payee-detail">
      <span class="payee-detail-key">
        <span class="payee-detail-icon">${icon}</span>
        <span class="payee-detail-label">${label}</span>
      </span>
      <span class="payee-detail-value">${valueHtml}</span>
    </div>`;
}

async function editPayee(id) {
  // Toggle off if the same card's edit is already open.
  if (_currentEditId === id) { closeCurrentEdit(); return; }
  // Only one editor at a time.
  closeCurrentEdit();

  const payee = getPayees().find(p => p.id === id);
  if (!payee) return;

  let passwordPlain = '';
  let decryptFailed = false;
  if (payee.passwordEnc) {
    try { passwordPlain = await decryptSecret(payee.passwordEnc); }
    catch (err) {
      decryptFailed = true;
      console.warn('decrypt failed', err);
    }
  } else if (payee.password) {
    passwordPlain = payee.password; // legacy plaintext — will be encrypted on save
  }

  const card = document.getElementById(`pr-${id}`);
  if (!card) return;
  card.classList.add('payee-card-active');

  const panel = document.createElement('div');
  panel.id = `pe-panel-${id}`;
  panel.className = 'payee-edit-panel';
  panel.innerHTML = `
    <div class="payee-edit">
      <div class="payee-edit-head">
        <div class="payee-edit-title">Edit details</div>
        <div class="payee-edit-actions-top">
          <button class="btn btn-ghost"   onclick="closeCurrentEdit()">Cancel</button>
          <button class="btn btn-primary" onclick="savePayeeEdit('${id}')">Save</button>
        </div>
      </div>

      <div class="payee-edit-section">
        <div class="payee-edit-section-title">Basics</div>
        <div class="payee-edit-grid">
          <label class="payee-field payee-field-wide">
            <span class="payee-field-label">Payee name</span>
            <input class="payee-input" id="pe-name-${id}" value="${escHtml(payee.name)}"
                   placeholder="e.g. Verizon"
                   onkeydown="if(event.key==='Escape')renderManagePayees();">
          </label>
          <label class="payee-field">
            <span class="payee-field-label">Default amount</span>
            <div class="payee-input-prefix">
              <span class="payee-input-prefix-sym">$</span>
              <input type="number" class="payee-input" id="pe-amt-${id}"
                     placeholder="0.00" value="${payee.defaultAmount || ''}" min="0" step="0.01">
            </div>
          </label>
          <label class="payee-toggle">
            <input type="checkbox" id="pe-recur-${id}" ${payee.isRecurring ? 'checked' : ''}>
            <span class="payee-toggle-text">🔄 Recurring bill</span>
          </label>
        </div>
      </div>

      <div class="payee-edit-section">
        <div class="payee-edit-section-title">How you pay</div>
        <div class="payee-edit-grid">
          <label class="payee-field">
            <span class="payee-field-label">Pay via</span>
            <select class="payee-input" id="pe-payvia-${id}" onchange="onPayViaChange('${id}')">
              <option value=""          ${!payee.payVia                ? 'selected' : ''}>— Select —</option>
              <option value="website"   ${payee.payVia === 'website'   ? 'selected' : ''}>🌐 Website</option>
              <option value="mobileApp" ${payee.payVia === 'mobileApp' ? 'selected' : ''}>📱 Mobile App</option>
            </select>
          </label>
          <label class="payee-field">
            <span class="payee-field-label">Website</span>
            <input class="payee-input" id="pe-website-${id}" type="url" inputmode="url"
                   value="${escHtml(payee.website || '')}"
                   placeholder="https://example.com"
                   autocomplete="off">
          </label>
          <label class="payee-field payee-field-wide" id="pe-appnote-wrap-${id}"
                 style="display:${payee.payVia === 'mobileApp' ? '' : 'none'}">
            <span class="payee-field-label">App / phone note</span>
            <input class="payee-input" id="pe-appnote-${id}"
                   value="${escHtml(payee.appNote || '')}"
                   placeholder="e.g. Chase app on iPhone">
          </label>
        </div>
      </div>

      <div class="payee-edit-section">
        <div class="payee-edit-section-title">Login <span class="payee-edit-section-hint">(stored locally — do not save bank credentials)</span></div>
        <div class="payee-edit-grid">
          <label class="payee-field">
            <span class="payee-field-label">User ID</span>
            <input class="payee-input" id="pe-userid-${id}"
                   value="${escHtml(payee.userId || '')}" placeholder="username or email"
                   autocomplete="off">
          </label>
          <label class="payee-field">
            <span class="payee-field-label">
              Password
              <span class="payee-field-hint" title="Encrypted at rest with a non-extractable AES-GCM key stored in IndexedDB">🔒 encrypted at rest</span>
            </span>
            <div class="payee-input-suffix">
              <input type="password" class="payee-input" id="pe-pw-${id}"
                     value="${escHtml(passwordPlain)}" placeholder="${decryptFailed ? '(could not decrypt — re-enter)' : '••••••••'}"
                     autocomplete="new-password" spellcheck="false">
              <button type="button" class="payee-pw-btn" id="pe-pw-btn-${id}" onclick="togglePayeePw('${id}')" title="Show password">👁</button>
            </div>
          </label>
          <label class="payee-toggle">
            <input type="checkbox" id="pe-2fa-${id}" ${payee.twoFactorRequired ? 'checked' : ''}>
            <span class="payee-toggle-text">🔐 Two-factor / OTP required</span>
          </label>
        </div>
      </div>

      <div class="payee-edit-footer">
        <button class="btn btn-ghost"   onclick="closeCurrentEdit()">Cancel</button>
        <button class="btn btn-primary" onclick="savePayeeEdit('${id}')">Save Changes</button>
      </div>
    </div>`;

  insertEditPanelInRow(panel, card);
  _currentEditId = id;

  _editResizeHandler = repositionEditPanel;
  window.addEventListener('resize', _editResizeHandler);

  document.getElementById(`pe-name-${id}`).focus({ preventScroll: true });
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function onPayViaChange(id) {
  const val = document.getElementById(`pe-payvia-${id}`).value;
  document.getElementById(`pe-appnote-wrap-${id}`).style.display = val === 'mobileApp' ? '' : 'none';
}

function togglePayeePw(id) {
  const el  = document.getElementById(`pe-pw-${id}`);
  const btn = document.getElementById(`pe-pw-btn-${id}`);
  if (el.type === 'password') {
    el.type = 'text';
    if (btn) { btn.textContent = '🙈'; btn.title = 'Hide password'; }
  } else {
    el.type = 'password';
    if (btn) { btn.textContent = '👁'; btn.title = 'Show password'; }
  }
}

async function savePayeeEdit(id) {
  const name              = document.getElementById(`pe-name-${id}`).value.trim();
  const isRecurring       = document.getElementById(`pe-recur-${id}`).checked;
  const defaultAmount     = parseFloat(document.getElementById(`pe-amt-${id}`).value) || 0;
  const payVia            = document.getElementById(`pe-payvia-${id}`).value;
  const website           = normalizeUrl(document.getElementById(`pe-website-${id}`).value.trim());
  const appNote           = payVia === 'mobileApp'
                              ? document.getElementById(`pe-appnote-${id}`).value.trim()
                              : '';
  const userId            = document.getElementById(`pe-userid-${id}`).value.trim();
  const passwordPlain     = document.getElementById(`pe-pw-${id}`).value;
  const twoFactorRequired = document.getElementById(`pe-2fa-${id}`).checked;

  if (!name) { showToast('Payee name cannot be empty', 'error'); return; }

  let passwordEnc = null;
  if (passwordPlain) {
    try {
      passwordEnc = await encryptSecret(passwordPlain);
    } catch (err) {
      showToast('Could not encrypt password: ' + err.message, 'error');
      return;
    }
  }

  updatePayee(id, { name, isRecurring, defaultAmount, payVia, website, appNote, userId, passwordEnc, twoFactorRequired });
  renderManagePayees();
  refreshPayeeSelects();
  showToast('Payee updated', 'success');
}

function removePayee(id) {
  if (confirm('Delete this payee? Bills using it will not be affected.')) {
    if (_currentEditId === id) closeCurrentEdit();
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

// Normalize "verizon.com" → "https://verizon.com". Leaves empty input empty.
function normalizeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s.replace(/^\/+/, '');
}

// Only return the URL if it parses and uses http(s) — blocks javascript:, data:, etc.
function sanitizeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {}
  return '';
}
