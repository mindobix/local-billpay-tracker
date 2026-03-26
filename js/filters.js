let gFilters = {
  search: '',
  payee: '',
  dateRange: '',
  fromDate: '',
  toDate: '',
};

function applyFilters(expenses) {
  const { search, payee, dateRange, fromDate, toDate } = gFilters;
  let filtered = expenses;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e =>
      (e.description || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q) ||
      (e.payee || e.paymentMethod || '').toLowerCase().includes(q) ||
      (e.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // Support both new `payee` field and legacy `paymentMethod` field
  if (payee) filtered = filtered.filter(e => (e.payee || e.paymentMethod || '') === payee);

  const today = new Date();
  if (dateRange === 'today') {
    filtered = filtered.filter(e => e.date === todayStr());
  } else if (dateRange === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    filtered = filtered.filter(e => e.date >= dateToStr(start));
  } else if (dateRange === 'month') {
    filtered = filtered.filter(e => e.date && e.date.startsWith(currentMonthKey()));
  } else if (dateRange === 'custom') {
    if (fromDate) filtered = filtered.filter(e => e.date >= fromDate);
    if (toDate)   filtered = filtered.filter(e => e.date <= toDate);
  }

  return filtered;
}

function onFilterChange() {
  gFilters.search    = document.getElementById('gf-search').value.trim();
  gFilters.payee     = document.getElementById('gf-payee').value;
  gFilters.dateRange = document.getElementById('gf-date').value;
  gFilters.fromDate  = document.getElementById('gf-from').value;
  gFilters.toDate    = document.getElementById('gf-to').value;

  document.getElementById('gf-custom-range').style.display =
    gFilters.dateRange === 'custom' ? 'flex' : 'none';

  renderExpenses();
  renderStatsBar();
  updateActiveFiltersBar();
}

function updateActiveFiltersBar() {
  const bar   = document.getElementById('gf-active-bar');
  const chips = document.getElementById('gf-active-chips');
  const active = [];

  if (gFilters.search)
    active.push({ label: `Search: "${gFilters.search}"`, clear: () => { document.getElementById('gf-search').value = ''; onFilterChange(); } });
  if (gFilters.payee)
    active.push({ label: `Payee: ${gFilters.payee}`, clear: () => { document.getElementById('gf-payee').value = ''; onFilterChange(); } });
  if (gFilters.dateRange && gFilters.dateRange !== 'custom') {
    const labels = { today: 'Today', week: 'This Week', month: 'This Month' };
    active.push({ label: labels[gFilters.dateRange] || gFilters.dateRange, clear: () => { document.getElementById('gf-date').value = ''; onFilterChange(); } });
  }
  if (gFilters.dateRange === 'custom' && (gFilters.fromDate || gFilters.toDate)) {
    const label = [gFilters.fromDate && formatDate(gFilters.fromDate), gFilters.toDate && formatDate(gFilters.toDate)].filter(Boolean).join(' → ');
    active.push({ label, clear: () => { document.getElementById('gf-date').value = ''; document.getElementById('gf-from').value = ''; document.getElementById('gf-to').value = ''; onFilterChange(); } });
  }

  if (active.length) {
    bar.style.display = 'flex';
    chips.innerHTML = active.map(a =>
      `<span class="gf-chip">${a.label}<button class="gf-chip-remove" onclick="(${a.clear.toString()})()">✕</button></span>`
    ).join('');
  } else {
    bar.style.display = 'none';
    chips.innerHTML = '';
  }
}

function resetFilters() {
  gFilters = { search: '', payee: '', dateRange: '', fromDate: '', toDate: '' };
  document.getElementById('gf-search').value    = '';
  document.getElementById('gf-payee').value     = '';
  document.getElementById('gf-date').value      = '';
  document.getElementById('gf-from').value      = '';
  document.getElementById('gf-to').value        = '';
  document.getElementById('gf-custom-range').style.display = 'none';
  document.getElementById('gf-active-bar').style.display   = 'none';
  renderExpenses();
  renderStatsBar();
}
