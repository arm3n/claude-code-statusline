#!/usr/bin/env node
// Claude Code status line — pure Node.js (no bash/MSYS2 fork issues on Windows)
const { execFileSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const CACHE_FILE = path.join(HOME, '.claude', 'plan-usage-cache.json');
const CREDENTIALS = path.join(HOME, '.claude', '.credentials.json');
const CACHE_TTL_MS = 5 * 60 * 1000; // refresh every 5 minutes

const input = fs.readFileSync(0, 'utf8');
const d = JSON.parse(input);

const cwd = d.workspace?.current_dir || '';
const pct = d.context_window?.used_percentage;
const user = os.userInfo().username;

// Write context % to cache file for hooks (context-guard) to read
if (pct != null) {
  try {
    fs.writeFileSync(path.join(HOME, '.claude', 'context-pct-cache.json'), JSON.stringify({ pct, ts: Date.now() }));
  } catch {}
}
const host = os.hostname();

// Git branch
let branch = '';
try {
  branch = execFileSync('git', ['--no-optional-locks', '-C', cwd, 'symbolic-ref', '--short', 'HEAD'], {
    encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
} catch (_) {
  try {
    branch = execFileSync('git', ['--no-optional-locks', '-C', cwd, 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (_) {}
}

// ANSI colors
const GREEN = '\x1b[32m';
const PURPLE = '\x1b[35m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const GRAY = '\x1b[37m';
const RESET = '\x1b[0m';

function ctxColor(pct) {
  if (pct == null) return GREEN;
  if (pct >= 70) return RED;
  if (pct >= 50) return YELLOW;
  return GREEN;
}

function utilizationColor(val) {
  if (val == null) return GRAY;
  if (val >= 0.8) return RED;
  if (val >= 0.5) return YELLOW;
  return GREEN;
}

// Read cached plan usage
function readCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

function writeCache(data) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(data)); } catch {}
}

// Probe Anthropic API for rate limit headers (cheap 1-token Haiku request)
function probeRateLimits() {
  return new Promise((resolve) => {
    let token;
    try {
      const creds = JSON.parse(fs.readFileSync(CREDENTIALS, 'utf8'));
      token = creds?.claudeAiOauth?.accessToken;
    } catch { resolve(null); return; }
    if (!token) { resolve(null); return; }

    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'oauth-2025-04-20',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const h = res.headers;
        const pf = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
        const result = {
          session5h: pf(h['anthropic-ratelimit-unified-5h-utilization']),
          session5hReset: pf(h['anthropic-ratelimit-unified-5h-reset']),
          weekly7d: pf(h['anthropic-ratelimit-unified-7d-utilization']),
          weekly7dReset: pf(h['anthropic-ratelimit-unified-7d-reset']),
          overage: pf(h['anthropic-ratelimit-unified-overage-utilization']),
          ts: Date.now()
        };
        resolve(result);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

function formatCountdown(ms) {
  if (ms <= 0) return 'now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d${h > 0 ? h + 'h' : ''}`;
  if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`;
  return `${m}m`;
}

(async () => {
  let out = `${GREEN}${user}@${host} ${PURPLE}${process.env.MSYSTEM || ''} ${YELLOW}${cwd}`;
  if (branch) out += ` ${CYAN}(${branch})`;
  if (pct != null) out += ` ${ctxColor(pct)}ctx:${pct}%`;

  // Get plan usage: use cache if fresh, otherwise probe in background
  let plan = readCache();
  const stale = !plan || !plan.ts || (Date.now() - plan.ts > CACHE_TTL_MS);

  if (stale) {
    const fresh = await probeRateLimits();
    if (fresh) {
      writeCache(fresh);
      plan = fresh;
    }
  }

  if (plan) {
    if (plan.session5h != null) {
      out += ` ${utilizationColor(plan.session5h)}5h:${Math.round(plan.session5h * 100)}%`;
      if (plan.session5hReset) {
        const remaining = plan.session5hReset * 1000 - Date.now();
        out += `(${formatCountdown(remaining)})`;
      }
    }
    if (plan.weekly7d != null) {
      out += ` ${utilizationColor(plan.weekly7d)}7d:${Math.round(plan.weekly7d * 100)}%`;
      if (plan.weekly7dReset) {
        const remaining = plan.weekly7dReset * 1000 - Date.now();
        out += `(${formatCountdown(remaining)})`;
      }
    }
  }

  out += RESET;
  process.stdout.write(out);
})();
