import { readAdminSession } from '../../lib/session.js';
import { ensureSchema } from '../../lib/db.js';
import { saveMemo } from '../../lib/memo-store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    return res.end();
  }
  const session = readAdminSession(req);
  if (!session?.email) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Sign in to edit the memo.' }));
  }
  let body = req.body;
  if (!body || typeof body !== 'object') {
    body = await new Promise((resolve) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
      });
    });
  }
  try {
    await ensureSchema();
    await saveMemo(body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
  } catch (err) {
    console.error('[admin-memo] save failed:', err?.message);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Save failed' }));
  }
}
