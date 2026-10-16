// Job Application Tracker: anonymous stats collector.
// Cloudflare Worker + D1 (SQLite). Stores only company, outcome, days, month.
// Never reads or stores IP addresses, headers, names, emails or role titles.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const ROW_KEYS = ['k', 'company', 'outcome', 'days', 'waited', 'month'];
const OUTCOMES = ['rejected', 'interview', 'no_reply'];
const MAX_ROWS_PER_REQUEST = 40;
const MAX_BODY_BYTES = 32 * 1024;

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });

export function companyKey(name) {
  return name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');
}

// Returns a clean row or throws Error(reason).
export function validateRow(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('row must be an object');
  const keys = Object.keys(r);
  if (keys.length !== ROW_KEYS.length || !ROW_KEYS.every((k) => keys.includes(k))) {
    throw new Error('row must have exactly: ' + ROW_KEYS.join(', '));
  }
  if (typeof r.k !== 'string' || !/^[0-9a-f]{64}$/.test(r.k)) throw new Error('bad k');
  if (typeof r.company !== 'string') throw new Error('bad company');
  const company = r.company.replace(/\s+/g, ' ').trim();
  if (company.length < 2 || company.length > 60) throw new Error('company length');
  if (/[@<>]|https?:|www\.|\d{7,}/i.test(company)) throw new Error('company looks like personal data');
  if (!OUTCOMES.includes(r.outcome)) throw new Error('bad outcome');
  const num = (v, max) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  let days = null;
  let waited = null;
  if (r.outcome === 'no_reply') {
    if (r.days !== null || !num(r.waited, 365) || !Number.isInteger(r.waited)) throw new Error('bad no_reply timing');
    waited = r.waited;
  } else {
    if (r.waited !== null || !num(r.days, 365)) throw new Error('bad reply timing');
    days = Math.round(r.days * 10) / 10;
  }
  if (typeof r.month !== 'string' || !/^20\d\d-(0[1-9]|1[0-2])$/.test(r.month)) throw new Error('bad month');
  const ck = companyKey(company);
  if (ck.length < 2) throw new Error('company has no letters');
  return { k: r.k, company, company_key: ck, outcome: r.outcome, days, waited, month: r.month };
}

async function handleSubmit(request, env) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY_BYTES) return json({ error: 'too large' }, 413);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: 'too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'invalid json' }, 400); }
  if (!body || body.version !== 1 || !Array.isArray(body.rows) || Object.keys(body).length !== 2) {
    return json({ error: 'expected {version:1, rows:[...]}' }, 400);
  }
  if (body.rows.length < 1 || body.rows.length > MAX_ROWS_PER_REQUEST) {
    return json({ error: 'rows must be 1 to ' + MAX_ROWS_PER_REQUEST }, 400);
  }
  const rows = [];
  try {
    for (const r of body.rows) rows.push(validateRow(r));
  } catch (e) {
    return json({ error: e.message }, 400);
  }

  const day = new Date().toISOString().slice(0, 10);
  const cap = Number(env.DAILY_ROW_CAP || 20000);
  const today = await env.DB.prepare('SELECT rows FROM daily WHERE day = ?').bind(day).first();
  if (today && today.rows + rows.length > cap) return json({ error: 'daily limit reached, try tomorrow' }, 429);

  const ins = env.DB.prepare(
    'INSERT OR IGNORE INTO responses (row_key, company_key, company, outcome, days, waited, month, received) VALUES (?,?,?,?,?,?,?,?)'
  );
  const stmts = rows.map((r) => ins.bind(r.k, r.company_key, r.company, r.outcome, r.days, r.waited, r.month, day));
  stmts.push(
    env.DB.prepare(
      'INSERT INTO daily (day, submissions, rows) VALUES (?, 1, ?) ON CONFLICT(day) DO UPDATE SET submissions = submissions + 1, rows = rows + excluded.rows'
    ).bind(day, rows.length)
  );
  await env.DB.batch(stmts);
  return json({ ok: true, received: rows.length });
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function handleStats(env) {
  const minN = Number(env.MIN_N || 5);
  const { results } = await env.DB.prepare(
    'SELECT company_key, company, outcome, days, waited FROM responses LIMIT 100000'
  ).all();
  const by = new Map();
  for (const r of results) {
    if (!by.has(r.company_key)) by.set(r.company_key, { name: r.company, rows: [] });
    by.get(r.company_key).rows.push(r);
  }
  const companies = [];
  for (const { name, rows } of by.values()) {
    if (rows.length < minN) continue;
    const replied = rows.filter((r) => r.days !== null);
    const ghosted = rows.filter((r) => r.outcome === 'no_reply' && r.waited >= 21).length;
    const mature = replied.length + ghosted;
    companies.push({
      company: name,
      applications: rows.length,
      replied: replied.length,
      interviews: rows.filter((r) => r.outcome === 'interview').length,
      median_days_to_reply: replied.length ? Math.round(median(replied.map((r) => r.days)) * 10) / 10 : null,
      ghost_rate: mature ? Math.round((ghosted / mature) * 100) / 100 : null,
    });
  }
  companies.sort((a, b) => b.applications - a.applications || a.company.localeCompare(b.company));
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM responses').first();
  return json(
    { updated: new Date().toISOString(), min_applications_to_list: minN, total_applications: total.n, companies },
    200,
    { 'Cache-Control': 'public, max-age=3600' }
  );
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (request.method === 'POST' && pathname === '/submit') return await handleSubmit(request, env);
      if (request.method === 'GET' && pathname === '/stats') return await handleStats(env);
      if (request.method === 'GET' && pathname === '/') {
        return new Response('Job Application Tracker stats collector. GET /stats for aggregates.', { headers: CORS });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'server error' }, 500);
    }
  },
};
