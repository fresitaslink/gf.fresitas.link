import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// ── Rate-limit safety net for entity list operations ──────────────────────
// The platform caps entity list requests (~70/min per caller). Fast page
// navigation across the app's many data-fetching components can exceed that
// and break pages. List operations pass through a client-side limiter and
// transparently retry on rate-limit errors instead of failing.
const LIST_OPS = new Set(['list', 'filter', 'count', 'aggregate', 'distinct']);
const MAX_PER_MIN = 55;
const WINDOW_MS = 60000;
const callTimes = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquireSlot() {
  for (;;) {
    const now = Date.now();
    while (callTimes.length && now - callTimes[0] > WINDOW_MS) callTimes.shift();
    if (callTimes.length < MAX_PER_MIN) { callTimes.push(now); return; }
    await sleep(WINDOW_MS - (now - callTimes[0]) + 50);
  }
}

function retryDelaySeconds(err) {
  const m = /Retry after ([\d.]+)s/i.exec(err?.message || '');
  return m ? parseFloat(m[1]) + 0.25 : 5;
}

async function runWithLimit(fn, thisArg, args) {
  await acquireSlot();
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn.apply(thisArg, args);
    } catch (err) {
      if (!/Rate limit exceeded/i.test(err?.message || '') || attempt >= 2) throw err;
      await sleep(retryDelaySeconds(err) * 1000);
      await acquireSlot();
    }
  }
}

const wrapEntity = (entity) => new Proxy(entity, {
  get(target, method) {
    const value = Reflect.get(target, method);
    if (typeof value !== 'function') return value;
    if (!LIST_OPS.has(method)) return value.bind(target);
    return (...args) => runWithLimit(value, target, args);
  }
});

base44.entities = new Proxy(base44.entities, {
  get(target, name) {
    const value = Reflect.get(target, name);
    if (value && typeof value === 'object') return wrapEntity(value);
    return value;
  }
});