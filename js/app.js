let currentView = 'calendar';

function toggleAddDropdown() {
  document.getElementById('header-add-menu').classList.toggle('open');
}

document.addEventListener('click', e => {
  const dropdown = document.getElementById('header-add-dropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    document.getElementById('header-add-menu').classList.remove('open');
  }
});

function switchView(view) {
  currentView = view;
  ['calendar', 'expenses', 'subscriptions', 'reports'].forEach(v => {
    document.getElementById(`view-${v}`).style.display = v === view ? '' : 'none';
    document.getElementById(`nav-${v}`).classList.toggle('active', v === view);
  });
  const showFilter = view === 'expenses' || view === 'calendar';
  document.getElementById('filter-bar').style.display = showFilter ? 'flex' : 'none';
  document.getElementById('gf-active-bar').style.display =
    showFilter && document.getElementById('gf-active-bar').innerHTML.includes('gf-chip') ? 'flex' : 'none';
  renderCurrentView();
}

function renderCurrentView() {
  if (currentView === 'calendar')      renderCalendar();
  else if (currentView === 'expenses') renderExpenses();
  else if (currentView === 'subscriptions') renderSubscriptions();
  else if (currentView === 'reports')      renderReports();
}

function renderAll() {
  renderStatsBar();
  renderCurrentView();
}

function renderStatsBar() {
  const expenses = getExpenses();
  const mk = currentMonthKey();
  const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(mk));
  const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const subs = expenses.filter(e => e.isSubscription);
  const subMonthly = subs.reduce((sum, e) => sum + monthlyEquivalent(e), 0);

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
  document.getElementById('stats-bar').innerHTML = `
    <div class="stat-item">
      <div class="stat-label">${monthName} Bills</div>
      <div class="stat-value">${formatCurrency(monthTotal)}</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-label">Subscriptions/mo</div>
      <div class="stat-value">${formatCurrency(subMonthly)}</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-label">Transactions</div>
      <div class="stat-value">${monthExpenses.length}</div>
    </div>
  `;
}

// ── Select refreshers (called from manage.js too) ─────────────────────────────

function refreshPayeeSelects() {
  const payees = getPayees().sort((a, b) => a.name.localeCompare(b.name));

  const dl = document.getElementById('payee-datalist');
  if (dl) dl.innerHTML = payees.map(p => `<option value="${p.name}">`).join('');

  const sel = document.getElementById('gf-payee');
  if (sel) {
    const current = sel.value;
    sel.innerHTML = '<option value="">All Payees</option>' +
      payees.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    if (current) sel.value = current;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  refreshPayeeSelects();

  document.getElementById('expense-overlay').addEventListener('click', e => {
    if (e.target.id === 'expense-overlay') closeExpenseModal();
  });
  document.getElementById('day-overlay').addEventListener('click', e => {
    if (e.target.id === 'day-overlay') closeDayModal();
  });
  document.getElementById('manage-overlay').addEventListener('click', e => {
    if (e.target.id === 'manage-overlay') closeManageModal();
  });
  document.getElementById('bulk-add-overlay').addEventListener('click', e => {
    if (e.target.id === 'bulk-add-overlay') closeBulkAddModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeExpenseModal();
      closeDayModal();
      closeManageModal();
      closeBulkAddModal();
    }
  });

  switchView('calendar');
  renderStatsBar();
});
