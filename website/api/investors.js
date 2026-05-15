import {
  ensureSchema,
  recordVisit,
  isEmailAllowed,
  isWhitelistEnabled,
  listDocuments,
  getDocumentBySlug,
} from '../lib/db.js';
import {
  buildSessionCookie,
  clearSessionCookie,
  readSession,
  clientIp,
} from '../lib/session.js';
import { sendVisitNotification } from '../lib/notify.js';
import { renderGate, renderMemo, renderDocumentList } from '../lib/templates.js';
import { ensureAtLeastOneDocument } from '../lib/doc-store.js';

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

function parseSlugFromUrl(url) {
  // Rewrites give us back the original URL: /investors or /investors/<slug>
  // (/investors/logout is special-cased by the rewrite separately)
  const u = new URL(url, 'http://x');
  const path = u.pathname.replace(/\/+$/, '');
  // path can be /investors or /investors/<slug>
  if (path === '/investors' || path === '/api/investors') return null;
  const m = path.match(/^\/(?:api\/)?investors\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req, res) {
  try {
    if (req.url && (req.url.startsWith('/investors/logout') || req.url.includes('logout=1'))) {
      return redirect(res, '/investors', { 'Set-Cookie': clearSessionCookie() });
    }

    if (req.method === 'POST') return handleAccess(req, res);

    // GET — show gate or doc/list based on session
    const session = readSession(req);
    if (!session) return sendHtml(res, 200, renderGate());

    try {
      await ensureSchema();
      await ensureAtLeastOneDocument();
    } catch (err) {
      console.error('[investors] schema/seed failed:', err?.message);
    }

    const slug = parseSlugFromUrl(req.url);

    if (slug) {
      const doc = await getDocumentBySlug(slug);
      if (!doc || !doc.visible) {
        // Document not visible — show 404-ish redirect to list
        return redirect(res, '/investors');
      }
      // Log a view event for this specific document
      try {
        await recordVisit({
          email: session.email,
          ip: clientIp(req),
          userAgent: req.headers['user-agent'] || '',
          action: 'view',
          documentSlug: doc.slug,
          documentTitle: doc.title,
        });
      } catch (err) {
        console.error('[investors] view log failed:', err?.message);
      }
      return sendHtml(res, 200, renderMemo({
        viewerEmail: session.email,
        memo: doc.content,
        documentTitle: doc.title,
        documentSlug: doc.slug,
        showBackLink: true,
      }));
    }

    // No slug — show the list of visible documents
    const docs = await listDocuments({ visibleOnly: true });
    return sendHtml(res, 200, renderDocumentList({ viewerEmail: session.email, documents: docs }));
  } catch (err) {
    console.error('[investors] handler error:', err);
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
      allowed = true;
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

  // Log a generic 'access' event (not yet tied to a specific document)
  try {
    await recordVisit({ email, ip, userAgent, action: 'access' });
  } catch (err) {
    console.error('[investors] access log failed:', err);
  }
  try {
    await sendVisitNotification({ email, ip, userAgent, action: 'access' });
  } catch (err) {
    console.error('[investors] notification failed:', err?.message);
  }

  const cookie = buildSessionCookie({ email });
  return redirect(res, '/investors', { 'Set-Cookie': cookie });
}
