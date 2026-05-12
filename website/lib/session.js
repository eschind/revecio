import crypto from 'crypto';

const VISITOR_COOKIE = 'reve_investor';
const ADMIN_COOKIE = 'reve_admin';
const VISITOR_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const ADMIN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const MAGIC_MAX_AGE = 15 * 60; // 15 minutes

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET not configured');
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payload) {
  const data = b64url(JSON.stringify(payload));
  const hmac = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const data = token.slice(0, dot);
  const hmac = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieString(name, value, { maxAge }) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function buildVisitorCookie(payload) {
  const exp = Math.floor(Date.now() / 1000) + VISITOR_MAX_AGE;
  return cookieString(VISITOR_COOKIE, sign({ kind: 'visitor', ...payload, exp }), { maxAge: VISITOR_MAX_AGE });
}

function clearVisitorCookie() {
  return cookieString(VISITOR_COOKIE, '', { maxAge: 0 });
}

function buildAdminCookie(payload) {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_MAX_AGE;
  return cookieString(ADMIN_COOKIE, sign({ kind: 'admin', ...payload, exp }), { maxAge: ADMIN_MAX_AGE });
}

function clearAdminCookie() {
  return cookieString(ADMIN_COOKIE, '', { maxAge: 0 });
}

function buildMagicLinkToken(email) {
  const exp = Math.floor(Date.now() / 1000) + MAGIC_MAX_AGE;
  return sign({ kind: 'magic', email, exp });
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const idx = c.indexOf('=');
      if (idx < 0) return [c.trim(), ''];
      return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
    })
  );
}

function readVisitorSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const payload = verify(cookies[VISITOR_COOKIE]);
  return payload && payload.kind === 'visitor' ? payload : null;
}

function readAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const payload = verify(cookies[ADMIN_COOKIE]);
  return payload && payload.kind === 'admin' ? payload : null;
}

function verifyMagicToken(token) {
  const payload = verify(token);
  return payload && payload.kind === 'magic' ? payload : null;
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

// Backwards-compat aliases used by existing investors.js
const buildSessionCookie = buildVisitorCookie;
const clearSessionCookie = clearVisitorCookie;
const readSession = readVisitorSession;

export {
  buildVisitorCookie,
  clearVisitorCookie,
  buildAdminCookie,
  clearAdminCookie,
  buildMagicLinkToken,
  readVisitorSession,
  readAdminSession,
  verifyMagicToken,
  clientIp,
  // legacy aliases
  buildSessionCookie,
  clearSessionCookie,
  readSession,
};
