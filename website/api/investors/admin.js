import {
  ensureSchema,
  listAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
  listRecentVisits,
} from '../../lib/db.js';
import {
  readAdminSession,
  buildAdminCookie,
  clearAdminCookie,
  buildMagicLinkToken,
  verifyMagicToken,
  clientIp,
} from '../../lib/session.js';
import { sendMagicLink } from '../../lib/notify.js';
import { renderAdminSignin, renderAdminDashboard } from '../../lib/admin-templates.js';
import { loadMemoForRender } from '../../lib/memo-store.js';

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

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const trim = (v, max = 320) => String(v ?? '').trim().slice(0, max);

function originFromReq(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  try {
    await ensureSchema();

    const url = new URL(req.url, 'http://x');
    const params = url.searchParams;

    // Sign-out
    if (params.get('signout')) {
      return redirect(res, '/investors/admin', { 'Set-Cookie': clearAdminCookie() });
    }

    // Magic-link landing
    if (params.get('magic')) {
      const payload = verifyMagicToken(params.get('magic'));
      const expectedEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
      if (!payload || payload.email !== expectedEmail) {
        return sendHtml(res, 401, renderAdminSignin({ error: 'That sign-in link is invalid or has expired.' }));
      }
      const cookie = buildAdminCookie({ email: payload.email });
      return redirect(res, '/investors/admin', { 'Set-Cookie': cookie });
    }

    if (req.method === 'POST') return handlePost(req, res);

    // GET — sign in or dashboard
    const session = readAdminSession(req);
    if (!session?.email) {
      return sendHtml(res, 200, renderAdminSignin({}));
    }
    return sendDashboard(res, session.email);
  } catch (err) {
    console.error('[admin] handler error:', err?.message, err?.stack);
    return sendHtml(res, 500, renderAdminSignin({ error: 'Something went wrong. Please try again.' }));
  }
}

async function handlePost(req, res) {
  const body = await readBody(req);
  const action = trim(body.action, 64);

  // Public action — request magic link
  if (action === 'request-link') {
    const email = trim(body.email).toLowerCase();
    const expectedEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    if (!email || !isEmail(email)) {
      return sendHtml(res, 400, renderAdminSignin({ error: 'Please enter a valid email.', prefillEmail: email }));
    }
    // Only send a link if it matches the admin email; otherwise silently pretend success
    if (email === expectedEmail) {
      try {
        const token = buildMagicLinkToken(email);
        const link = `${originFromReq(req)}/investors/admin?magic=${encodeURIComponent(token)}`;
        await sendMagicLink({ to: email, link });
      } catch (err) {
        console.error('[admin] failed to send magic link:', err?.message);
        return sendHtml(res, 500, renderAdminSignin({ error: 'Could not send sign-in email. Try again in a minute.', prefillEmail: email }));
      }
    }
    return sendHtml(res, 200, renderAdminSignin({
      message: 'If that email is recognized, a sign-in link is on its way (valid for 15 minutes).',
    }));
  }

  // All other actions require an admin session
  const session = readAdminSession(req);
  if (!session?.email) {
    return sendHtml(res, 401, renderAdminSignin({ error: 'Please sign in.' }));
  }

  if (action === 'add-email') {
    const email = trim(body.email).toLowerCase();
    const note = trim(body.note, 200) || null;
    if (!email || !isEmail(email)) {
      return sendDashboard(res, session.email, { savedMessage: 'Invalid email — not added.' });
    }
    await addAllowedEmail(email, note);
    return sendDashboard(res, session.email, { savedMessage: `Added ${email} to the whitelist.` });
  }

  if (action === 'remove-email') {
    const email = trim(body.email).toLowerCase();
    if (email) await removeAllowedEmail(email);
    return sendDashboard(res, session.email, { savedMessage: email ? `Removed ${email}.` : 'No email provided.' });
  }

  return sendDashboard(res, session.email);
}

async function sendDashboard(res, adminEmail, opts = {}) {
  const [memo, allowedEmails, visits] = await Promise.all([
    loadMemoForRender(),
    listAllowedEmails(),
    listRecentVisits(40),
  ]);
  return sendHtml(res, 200, renderAdminDashboard({
    adminEmail,
    memo,
    allowedEmails,
    visits,
    savedMessage: opts.savedMessage,
  }));
}
