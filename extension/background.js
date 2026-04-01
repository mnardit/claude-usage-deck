// Claude Usage Deck — Service Worker
// Polls claude.ai usage API, renders adaptive badge icon

const ALARM_NAME = 'poll-usage';
const POLL_INTERVAL_MIN = 5;
const ORGS_URL = 'https://claude.ai/api/organizations';
const DEFAULT_METRIC = 'seven_day';

const COLORS = {
  safe:    '#22C55E', // 0-49%
  warning: '#F59E0B', // 50-79%
  danger:  '#EF4444', // 80-100%
  muted:   '#71717A', // no data
};

function getBadgeColor(utilization) {
  if (utilization == null) return COLORS.muted;
  if (utilization < 50) return COLORS.safe;
  if (utilization < 80) return COLORS.warning;
  return COLORS.danger;
}

// Format time remaining for badge text: "45m", "2h", "3d"
function formatBadgeTime(resetsAt) {
  if (!resetsAt) return '';
  const diff = new Date(resetsAt) - Date.now();
  if (diff <= 0) return '';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Small icon (16/19px): solid colored circle, no text
function renderSmallIcon(size, colorHex) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Dark background
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#0B0B0C';
  ctx.fill();

  // Colored status circle (slightly inset for a clean edge)
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

// Large icon (32/38px): one thick ring + number in center
function renderLargeIcon(size, usagePct, colorHex) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const strokeWidth = Math.round(size * 0.15);
  const radius = size / 2 - strokeWidth / 2 - 1;
  const startAngle = -Math.PI / 2;

  // Dark background
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#0B0B0C';
  ctx.fill();

  // Ring track
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  // Ring fill: usage %
  if (usagePct > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle,
      startAngle + Math.PI * 2 * Math.min(usagePct, 100) / 100);
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Center number
  if (usagePct > 0) {
    const fontSize = Math.round(size * 0.38);
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.round(usagePct)), cx, cy + 0.5);
  }

  return ctx.getImageData(0, 0, size, size);
}

// Update badge icon based on selected metric
async function updateBadgeIcon() {
  const { usage, badgeMetric } = await chrome.storage.local.get(['usage', 'badgeMetric']);
  const metric = badgeMetric || DEFAULT_METRIC;
  const data = usage?.[metric];

  const usagePct = data?.utilization ?? 0;
  const color = getBadgeColor(data?.utilization);

  // Adaptive rendering: small = solid circle, large = ring + number
  const imageData = {
    16: renderSmallIcon(16, color),
    19: renderSmallIcon(19, color),
    32: renderLargeIcon(32, usagePct, color),
    38: renderLargeIcon(38, usagePct, color),
  };
  chrome.action.setIcon({ imageData });

  // Badge text: time until reset
  const badgeTime = formatBadgeTime(data?.resets_at);
  chrome.action.setBadgeText({ text: badgeTime });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Fetch org_id from claude.ai API
async function fetchOrgId() {
  const resp = await fetch(ORGS_URL, { credentials: 'include' });
  if (!resp.ok) throw new Error(`Organizations API returned ${resp.status}`);
  const orgs = await resp.json();
  if (!Array.isArray(orgs) || orgs.length === 0) {
    throw new Error('No organizations found');
  }
  return orgs[0].uuid;
}

// Fetch usage data for the given org
async function fetchUsage(orgId) {
  const url = `https://claude.ai/api/organizations/${orgId}/usage`;
  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) throw new Error(`Usage API returned ${resp.status}`);
  return resp.json();
}

// Main polling function
async function pollUsage() {
  try {
    let { orgId } = await chrome.storage.local.get('orgId');
    if (!orgId) {
      orgId = await fetchOrgId();
      await chrome.storage.local.set({ orgId });
    }

    const usage = await fetchUsage(orgId);
    await chrome.storage.local.set({
      usage,
      lastUpdated: new Date().toISOString(),
      error: null,
    });

    updateBadgeIcon();
  } catch (err) {
    console.error('Claude Usage Deck: poll failed', err);

    if (err.message.includes('401') || err.message.includes('403')) {
      await chrome.storage.local.remove('orgId');
    }

    await chrome.storage.local.set({ error: err.message });
    updateBadgeIcon();
  }
}

// React to metric preference changes from popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.badgeMetric) updateBadgeIcon();
});

// Handle manual refresh from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'refresh') pollUsage();
});

// Set up alarm on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MIN });
  pollUsage();
});

// Also set up on service worker startup (browser restart)
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MIN });
  pollUsage();
});

// Handle alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) pollUsage();
});
