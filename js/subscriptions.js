function renderSubscriptions() {
  const allExpenses = getExpenses();
  const subs = allExpenses.filter(e => e.isSubscription);
  const container = document.getElementById('subs-container');

  if (!subs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔄</div>
        <p class="empty-text">No subscriptions tracked yet.</p>
        <p class="empty-sub">Mark a bill as a subscription when adding it.</p>
        <button class="btn btn-primary" onclick="openAddModal(true)">+ Add Subscription</button>
      </div>`;
    return;
  }

  // Totals
  const monthly = subs.reduce((sum, e) => sum + monthlyEquivalent(e), 0);
  const yearly = monthly * 12;

  // Group by frequency
  const groups = { weekly: [], monthly: [], yearly: [] };
  subs.forEach(e => {
    const freq = e.frequency || 'monthly';
    if (groups[freq]) groups[freq].push(e);
    else groups.monthly.push(e);
  });

  const freqLabels = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
  const freqSuffix = { weekly: '/wk', monthly: '/mo', yearly: '/yr' };

  let html = `
    <div class="subs-summary">
      <div class="subs-stat">
        <div class="subs-stat-label">Monthly Cost</div>
        <div class="subs-stat-value">${formatCurrency(monthly)}</div>
      </div>
      <div class="subs-stat-divider"></div>
      <div class="subs-stat">
        <div class="subs-stat-label">Yearly Cost</div>
        <div class="subs-stat-value">${formatCurrency(yearly)}</div>
      </div>
      <div class="subs-stat-divider"></div>
      <div class="subs-stat">
        <div class="subs-stat-label">Active Subscriptions</div>
        <div class="subs-stat-value">${subs.length}</div>
      </div>
    </div>`;

  Object.entries(groups).forEach(([freq, items]) => {
    if (!items.length) return;
    const groupTotal = items.reduce((s, e) => s + Number(e.amount), 0);
    html += `
      <div class="subs-group">
        <div class="subs-group-header">
          <span class="subs-group-label">${freqLabels[freq]}</span>
          <span class="subs-group-total">${formatCurrency(groupTotal)} ${freqSuffix[freq]}</span>
        </div>
        <div class="subs-list">
          ${items.map(e => {
            return `
              <div class="sub-card">
                <div class="sub-card-icon">🔄</div>
                <div class="sub-card-info">
                  <div class="sub-card-name">${e.description || 'Subscription'}</div>
                  <div class="sub-card-meta">${(e.payee || e.paymentMethod) ? (e.payee || e.paymentMethod) : ''}${e.date ? ' · Since ' + formatDate(e.date) : ''}</div>
                  ${e.notes ? `<div class="sub-card-notes">${e.notes}</div>` : ''}
                </div>
                <div class="sub-card-right">
                  <div class="sub-card-amount">${formatCurrency(e.amount)}<span class="sub-card-freq">${freqSuffix[freq]}</span></div>
                  <div class="sub-card-monthly">${freq !== 'monthly' ? '≈ ' + formatCurrency(monthlyEquivalent(e)) + '/mo' : ''}</div>
                </div>
                <div class="sub-card-actions">
                  <button class="icon-btn edit-btn" onclick="openEditModal('${e.id}')" title="Edit">✎</button>
                  <button class="icon-btn del-btn" onclick="confirmDelete('${e.id}')" title="Delete">✕</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}
