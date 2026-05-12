import { ensureSchema, recordVisit } from '../lib/db.js';
import {
  buildSessionCookie,
  clearSessionCookie,
  readSession,
  clientIp,
} from '../lib/session.js';
import { sendVisitNotification } from '../lib/notify.js';
import { renderGate, renderMemo, escapeHtml } from '../lib/templates.js';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const trim = (v, max = 320) => String(v ?? '').trim().slice(0, max);

function sendHtml(res, status, html, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(html);
}

function redirect(res, to, extraHeaders = {}) {
  res.statusCode = 302;
  res.setHeader('Location', to);
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end();
}

export default async function handler(req, res) {
  try {
    // /investors/logout
    if (req.url && req.url.startsWith('/investors/logout')) {
      return redirect(res, '/investors', { 'Set-Cookie': clearSessionCookie() });
    }

    if (req.method === 'POST') {
      return handleAccess(req, res);
    }

    // GET — show gate or memo based on session
    const session = readSession(req);
    if (!session) {
      return sendHtml(res, 200, renderGate());
    }
    return sendHtml(res, 200, renderMemo({ viewerEmail: session.email }));
  } catch (err) {
    console.error('investors handler error:', err);
    return sendHtml(res, 500, renderGate({ error: 'Something went wrong. Please try again.' }));
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '').toLowerCase();
      try {
        if (ct.includes('application/json')) return resolve(JSON.parse(raw || '{}'));
        if (ct.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(raw);
          const obj = {};
          for (const [k, v] of params) obj[k] = v;
          return resolve(obj);
        }
        resolve({});
      } catch {
        resolve({});
      }
    });
  });
}

async function handleAccess(req, res) {
  const body = await readBody(req);
  const email = trim(body.email).toLowerCase();
  const password = trim(body.password, 200);

  if (!email || !password) {
    return sendHtml(res, 400, renderGate({ error: 'Please enter your email and the access code.', prefillEmail: email }));
  }
  if (!isEmail(email)) {
    return sendHtml(res, 400, renderGate({ error: 'Please enter a valid email address.', prefillEmail: email }));
  }
  if (!process.env.INVESTOR_PASSWORD) {
    return sendHtml(res, 500, renderGate({ error: 'Access is temporarily unavailable.', prefillEmail: email }));
  }
  if (password !== process.env.INVESTOR_PASSWORD) {
    return sendHtml(res, 401, renderGate({ error: 'That access code is not correct.', prefillEmail: email }));
  }

  const ip = clientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  // Ensure schema, then log visit (don't block on email)
  try {
    await ensureSchema();
    await recordVisit({ email, ip, userAgent, action: 'view' });
  } catch (err) {
    console.error('visit logging failed:', err);
    // continue — do not block access on logging failure
  }

  // Must await — Vercel's serverless runtime can terminate fire-and-forget
  // promises as soon as the response is sent.
  try {
    await sendVisitNotification({ email, ip, userAgent, action: 'view' });
  } catch (err) {
    console.error('notification failed:', err);
  }

  const cookie = buildSessionCookie({ email });
  return redirect(res, '/investors', { 'Set-Cookie': cookie });
}
