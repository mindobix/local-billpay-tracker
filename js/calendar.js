let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

function renderCalendar() {
  const expenses = getExpenses();
  const mk = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

  // Build day → expenses map
  const dayMap = {};
  expenses.filter(e => e.date && e.date.startsWith(mk)).forEach(e => {
    const day = parseInt(e.date.slice(8, 10), 10);
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(e);
  });

  // Month label
  const label = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('month-label').textContent = label;

  // Monthly total
  const monthTotal = Object.values(dayMap).flat().reduce((s, e) => s + Number(e.amount), 0);
  const totalEl = document.getElementById('monthly-total');
  totalEl.textContent = monthTotal > 0 ? formatCurrency(monthTotal) + ' this month' : '';

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let html = daysOfWeek.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = todayStr();

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayExpenses = dayMap[d] || [];
    const total = dayExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const isToday = dateStr === today;

    // Bill count dots (up to 4)
    const dots = dayExpenses.slice(0, 4).map(() =>
      `<span class="cal-dot"></span>`
    ).join('');

    html += `
      <div class="cal-cell${isToday ? ' today' : ''}${dayExpenses.length ? ' has-data' : ''}"
           onclick="openDayModal('${dateStr}')">
        <div class="cal-cell-top">
          <span class="cal-day-num${isToday ? ' today-num' : ''}">${d}</span>
          <div class="cal-dots">${dots}</div>
        </div>
        ${total > 0 ? `<div class="cal-day-total">${formatCurrency(total)}</div>` : ''}
        ${dayExpenses.length > 0 ? `<div class="cal-day-count">${dayExpenses.length} item${dayExpenses.length > 1 ? 's' : ''}</div>` : ''}
      </div>`;
  }

  document.getElementById('cal-grid').innerHTML = html;
}

function shiftMonth(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function jumpToday() {
  calYear = new Date().getFullYear();
  calMonth = new Date().getMonth();
  renderCalendar();
}

function openDayModal(dateStr) {
  const expenses = getExpenses().filter(e => e.date === dateStr);
  showDayModal(dateStr, expenses);
}
