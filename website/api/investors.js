import { ensureSchema, recordVisit, isEmailAllowed, isWhitelistEnabled } from '../lib/db.js';
import {
  buildSessionCookie,
  clearSessionCookie,
  readSession,
  clientIp,
} from '../lib/session.js';
import { sendVisitNotification } from '../lib/notify.js';
import { renderGate, renderMemo } from '../lib/templates.js';
import { loadMemoForRender } from '../lib/memo-store.js';

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

    let memo;
    try {
      await ensureSchema();
      memo = await loadMemoForRender();
    } catch (err) {
      console.error('[investors] memo load failed:', err?.message);
    }
    return sendHtml(res, 200, renderMemo({ viewerEmail: session.email, memo }));
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

  // Whitelist check (if enabled). Admin email is always allowed.
  try {
    await ensureSchema();
  } catch (err) {
    console.error('[investors] ensureSchema failed:', err);
  }
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  let allowed = email === adminEmail;
  if (!allowed) {
    let whitelistOn = true;
    try {
      whitelistOn = await isWhitelistEnabled();
    } catch (err) {
      console.error('[investors] whitelist flag read failed (defaulting ON):', err);
    }
    if (!whitelistOn) {
      allowed = true; // Whitelist disabled — any valid email + correct password is allowed
    } else {
      try {
        allowed = await isEmailAllowed(email);
      } catch (err) {
        console.error('[investors] whitelist check failed:', err);
      }
    }
  }
  if (!allowed) {
    return sendHtml(res, 403, renderGate({
      error: 'That email is not on the access list. Please reach out to eytan@revecio.com if you believe this is in error.',
      prefillEmail: email,
    }));
  }

  const ip = clientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  try {
    await recordVisit({ email, ip, userAgent, action: 'view' });
  } catch (err) {
    console.error('visit logging failed:', err);
  }

  try {
    await sendVisitNotification({ email, ip, userAgent, action: 'view' });
  } catch (err) {
    console.error('[investors] notification failed:', err?.message, err?.stack);
  }

  const cookie = buildSessionCookie({ email });
  return redirect(res, '/investors', { 'Set-Cookie': cookie });
}
