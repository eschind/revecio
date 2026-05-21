import {
  ensureSchema,
  listAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
  listRecentVisits,
  deleteInternalVisits,
  isWhitelistEnabled,
  isDeckVisible,
  setDeckVisible,
  setWhitelistEnabled,
  listDocuments,
  getDocumentBySlug,
  setDocumentVisible,
  deleteDocument,
  updateDocument,
} from '../../lib/db.js';
import {
  readAdminSession,
  buildAdminCookie,
  clearAdminCookie,
  buildMagicLinkToken,
  verifyMagicToken,
} from '../../lib/session.js';
import { sendMagicLink } from '../../lib/notify.js';
import {
  renderAdminSignin,
  renderAdminDocEdit,
  renderAdminSettings,
  renderAdminActivity,
} from '../../lib/admin-templates.js';
import {
  ensureAtLeastOneDocument,
  createNewDocument,
} from '../../lib/doc-store.js';

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

function parseSection(url) {
  const u = new URL(url, 'http://x');
  const path = u.pathname.replace(/\/+$/, '');
  // Possibilities (post-rewrite):
  //   /investors/admin                       → null
  //   /investors/admin/settings              → settings
  //   /investors/admin/activity              → activity
  //   /investors/admin/doc/<slug>            → { section: 'doc', slug }
  const m = path.match(/^\/(?:api\/)?investors\/admin(?:\/(.+))?$/);
  if (!m) return { section: null };
  const tail = m[1];
  if (!tail) return { section: null };
  if (tail === 'settings') return { section: 'settings' };
  if (tail === 'activity') return { section: 'activity' };
  const docMatch = tail.match(/^doc\/([^/]+)\/?$/);
  if (docMatch) return { section: 'doc', slug: decodeURIComponent(docMatch[1]) };
  return { section: null };
}

export default async function handler(req, res) {
  try {
    await ensureSchema();
    await ensureAtLeastOneDocument();

    const url = new URL(req.url, 'http://x');
    if (url.searchParams.get('signout')) {
      return redirect(res, '/investors/admin', { 'Set-Cookie': clearAdminCookie() });
    }

    // Magic-link landing
    if (url.searchParams.get('magic')) {
      const payload = verifyMagicToken(url.searchParams.get('magic'));
      const expectedEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
      if (!payload || payload.email !== expectedEmail) {
        return sendHtml(res, 401, renderAdminSignin({ error: 'That sign-in link is invalid or has expired.' }));
      }
      return redirect(res, '/investors/admin', { 'Set-Cookie': buildAdminCookie({ email: payload.email }) });
    }

    if (req.method === 'POST') return handlePost(req, res, url);

    // GET — section routing
    const session = readAdminSession(req);
    if (!session?.email) {
      return sendHtml(res, 200, renderAdminSignin({}));
    }

    return renderSection(req, res, session.email, url);
  } catch (err) {
    console.error('[admin] handler error:', err?.message, err?.stack);
    return sendHtml(res, 500, renderAdminSignin({ error: 'Something went wrong. Please try again.' }));
  }
}

async function renderSection(req, res, adminEmail, url, opts = {}) {
  const { section, slug } = parseSection(req.url);

  if (section === 'settings') {
    const [documents, allowedEmails, whitelistEnabled, deckVisible] = await Promise.all([
      listDocuments(), listAllowedEmails(), isWhitelistEnabled(), isDeckVisible(),
    ]);
    const deckDoc = { slug: 'deck', title: 'Reve Investor Deck', visible: deckVisible, external: true };
    return sendHtml(res, 200, renderAdminSettings({
      adminEmail, documents: [deckDoc, ...documents], allowedEmails, whitelistEnabled,
      savedMessage: opts.savedMessage,
    }));
  }

  if (section === 'activity') {
    try { await deleteInternalVisits(); } catch (err) { console.error('[admin] cleanup internal visits failed:', err?.message); }
    const [documents, visits] = await Promise.all([
      listDocuments(), listRecentVisits(80),
    ]);
    return sendHtml(res, 200, renderAdminActivity({ adminEmail, documents, visits }));
  }

  if (section === 'doc') {
    const documents = await listDocuments();
    const doc = await getDocumentBySlug(slug);
    if (!doc) return redirect(res, '/investors/admin');
    return sendHtml(res, 200, renderAdminDocEdit({
      adminEmail, documents, doc, savedMessage: opts.savedMessage,
    }));
  }

  // section === null → default: send to first doc, or settings if none
  const documents = await listDocuments();
  if (documents.length > 0) {
    return redirect(res, `/investors/admin/doc/${encodeURIComponent(documents[0].slug)}`);
  }
  return redirect(res, '/investors/admin/settings');
}

async function handlePost(req, res, url) {
  const body = await readBody(req);
  const action = trim(body.action, 64);

  // Public action — request magic link
  if (action === 'request-link') {
    const email = trim(body.email).toLowerCase();
    const expectedEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    if (!email || !isEmail(email)) {
      return sendHtml(res, 400, renderAdminSignin({ error: 'Please enter a valid email.', prefillEmail: email }));
    }
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
    if (email && isEmail(email)) await addAllowedEmail(email, note);
    return redirect(res, '/investors/admin/settings');
  }
  if (action === 'remove-email') {
    const email = trim(body.email).toLowerCase();
    if (email) await removeAllowedEmail(email);
    return redirect(res, '/investors/admin/settings');
  }
  if (action === 'toggle-whitelist') {
    const enabled = String(body.enabled || '').toLowerCase() === 'true';
    await setWhitelistEnabled(enabled);
    return redirect(res, '/investors/admin/settings');
  }
  if (action === 'toggle-doc-visible') {
    const slug = trim(body.slug, 80);
    const visible = String(body.visible || '').toLowerCase() === 'true';
    if (slug === 'deck') await setDeckVisible(visible);
    else if (slug) await setDocumentVisible(slug, visible);
    return redirect(res, '/investors/admin/settings');
  }
  if (action === 'delete-doc') {
    const slug = trim(body.slug, 80);
    if (slug && slug !== 'deck') await deleteDocument(slug);
    return redirect(res, '/investors/admin/settings');
  }
  if (action === 'new-doc') {
    const title = trim(body.title, 120);
    if (title) {
      const created = await createNewDocument({ title });
      return redirect(res, `/investors/admin/doc/${encodeURIComponent(created.slug)}`);
    }
    return redirect(res, '/investors/admin');
  }

  return redirect(res, '/investors/admin');
}
