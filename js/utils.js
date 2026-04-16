/**
 * CCXNY Utility Infrastructure (utils.js)
 * NYS 1115 Waiver | Cryptography & Presentation Primitives
 */

export async function sha256Hex(message) {
  if (typeof message !== 'string') {
    throw new TypeError('Cryptographic hasher requires a strict string payload.');
  }
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

const STATE_TTL_MS = 15 * 60 * 1000;

export function saveState(key, data) {
  const payload = {
    timestamp: Date.now(),
    data: data
  };
  try {
    sessionStorage.setItem(`ccx_${key}`, JSON.stringify(payload));
  } catch (error) {
    console.error('[CRITICAL] Storage Quota Exceeded.');
    sessionStorage.clear();
    window.location.reload(); 
  }
}

export function loadState(key) {
  const raw = sessionStorage.getItem(`ccx_${key}`);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    const age = Date.now() - payload.timestamp;
    if (age > STATE_TTL_MS) {
      sessionStorage.removeItem(`ccx_${key}`);
      return null;
    }
    return payload.data;
  } catch (e) {
    sessionStorage.removeItem(`ccx_${key}`);
    return null;
  }
}

export function requireStateOrRedirect(key, validator) {
  const state = loadState(key);
  if (!state || (validator && !validator(state))) {
    console.warn(`[SECURITY] Required state '${key}' missing or invalid. Redirecting to dashboard.`);
    window.location.href = 'index.html';
    return null;
  }
  return state;
}

export function safeText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
    return true;
  }
  return false;
}

export function sanitizeNumber(input, min, max) {
  const num = Number(input);
  if (isNaN(num)) return min;
  return Math.min(max, Math.max(min, num));
}

export async function exportCryptographicCSV(data, filename = 'ccx_export.csv') {
  if (!Array.isArray(data) || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      let val = obj[header] === null || obj[header] === undefined ? '' : obj[header];
      if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
      return val;
    }).join(',')
  );
  let csvContent = headers.join(',') + '\n' + rows.join('\n');
  const contentHash = await sha256Hex(csvContent);
  csvContent += `\n\n--- COMPLIANCE WATERMARK ---\n`;
  csvContent += `Exported_At,${new Date().toISOString()}\n`;
  csvContent += `SHA256_Hash,${contentHash}\n`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

let countdownInterval;
export function startLatencyCountdown() {
  let timeLeft = 90;
  const timerEl = document.getElementById('latency-timer');
  const hudLatencyEl = document.getElementById('hud-latency');
  if (countdownInterval) clearInterval(countdownInterval);
  
  countdownInterval = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.textContent = timeLeft;
    if (hudLatencyEl) hudLatencyEl.textContent = timeLeft + 's';
    if (timeLeft <= 0) clearInterval(countdownInterval);
  }, 1000);
}
