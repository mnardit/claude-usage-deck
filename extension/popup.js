// Claude Usage Deck — Popup Logic

const METRICS = [
  { id: 'metric-session', key: 'five_hour' },
  { id: 'metric-weekly', key: 'seven_day' },
  { id: 'metric-sonnet', key: 'seven_day_sonnet' },
];

// Read status colors from CSS variables so they adapt to light/dark theme
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getColor(utilization) {
  if (utilization == null) return cssVar('--muted');
  if (utilization < 50) return cssVar('--safe');
  if (utilization < 80) return cssVar('--warning');
  return cssVar('--danger');
}

function getStatusText(utilization) {
  if (utilization == null) return '—';
  if (utilization < 50) return 'Safe';
  if (utilization < 80) return 'Moderate';
  return 'High';
}

// Format countdown: "Resets in 2h 15m (Fri 6:00 PM)"
function formatCountdown(resetsAt) {
  if (!resetsAt) return '—';
  const resetDate = new Date(resetsAt);
  const diff = resetDate - Date.now();
  if (diff <= 0 || diff < 60000) return 'Resetting soon…';

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  let relative;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    relative = `${days}d ${remHours}h`;
  } else if (hours > 0) {
    relative = `${hours}h ${minutes}m`;
  } else {
    relative = `${minutes}m`;
  }

  const weekday = resetDate.toLocaleDateString([], { weekday: 'short' });
  const time = resetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `Resets in ${relative} (${weekday} ${time})`;
}

// Format "last updated" relative time
function formatLastUpdated(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// Format time in user's locale
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderMetric(el, data) {
  const valueEl = el.querySelector('.metric-value');
  const barEl = el.querySelector('.progress-bar');
  const resetEl = el.querySelector('.metric-reset');

  if (!data || data.utilization == null) {
    valueEl.textContent = '—';
    valueEl.style.color = '';
    barEl.style.width = '0%';
    barEl.style.backgroundColor = '';
    resetEl.textContent = '—';
    return;
  }

  const pct = Math.round(data.utilization);
  const color = getColor(data.utilization);

  valueEl.textContent = `${pct}%`;
  valueEl.style.color = color;
  barEl.style.width = `${Math.min(pct, 100)}%`;
  barEl.style.backgroundColor = color;
  resetEl.textContent = formatCountdown(data.resets_at);
}

// Window Anchor Insight: show when the 5h session window started and resets
function renderWindowAnchor(usage) {
  const anchorEl = document.getElementById('window-anchor');
  if (!anchorEl) return;

  const session = usage && usage.five_hour;
  if (!session || !session.resets_at) {
    anchorEl.textContent = '';
    return;
  }

  const resetsAt = new Date(session.resets_at);
  const startedAt = new Date(resetsAt.getTime() - 5 * 3600000);
  anchorEl.textContent = `Window: ${formatTime(startedAt)}\u2009–\u2009${formatTime(resetsAt)}`;
}

// Status summary: quick decision-support indicators
function renderStatusSummary(usage) {
  document.querySelectorAll('.status-item').forEach(item => {
    const key = item.dataset.for;
    const data = usage && usage[key];
    const dot = item.querySelector('.status-dot');
    const text = item.querySelector('.status-text');
    const util = data ? data.utilization : null;
    const color = getColor(util);

    dot.style.backgroundColor = color;
    text.textContent = getStatusText(util);
  });
}

function render(storage) {
  const { usage, lastUpdated, error } = storage;

  // Error banner
  const banner = document.getElementById('error-banner');
  const errorText = document.getElementById('error-text');
  if (error) {
    errorText.textContent = error.includes('401') || error.includes('403')
      ? 'Please log in to claude.ai'
      : `Error: ${error}`;
    banner.classList.remove('hidden');
  } else if (!usage && !lastUpdated) {
    errorText.textContent = 'Loading…';
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }

  // Last updated
  document.getElementById('last-updated').textContent = formatLastUpdated(lastUpdated);

  // Stale indicator (>10 min)
  const stale = lastUpdated && (Date.now() - new Date(lastUpdated)) > 600000;
  document.getElementById('app').classList.toggle('stale', !!stale);

  // Status summary
  renderStatusSummary(usage);

  // Metrics
  if (!usage) return;
  for (const metric of METRICS) {
    const el = document.getElementById(metric.id);
    renderMetric(el, usage[metric.key]);
  }

  // Window anchor
  renderWindowAnchor(usage);
}

// Badge metric selector (segmented control)
async function initSelector() {
  const { badgeMetric } = await chrome.storage.local.get('badgeMetric');
  const current = badgeMetric || 'seven_day';

  document.querySelectorAll('.segment').forEach(btn => {
    if (btn.dataset.metric === current) btn.classList.add('selected');
    else btn.classList.remove('selected');

    btn.addEventListener('click', async () => {
      document.querySelectorAll('.segment').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      await chrome.storage.local.set({ badgeMetric: btn.dataset.metric });
    });
  });
}

// Manual refresh
document.getElementById('refresh-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'refresh' });
  document.getElementById('last-updated').textContent = 'refreshing…';
  setTimeout(() => {
    chrome.storage.local.get(['usage', 'lastUpdated', 'error'], render);
  }, 2000);
});

// Initial render
chrome.storage.local.get(['usage', 'lastUpdated', 'error'], render);
initSelector();

// Live updates every 30s
setInterval(() => {
  chrome.storage.local.get(['usage', 'lastUpdated', 'error'], render);
}, 30000);
