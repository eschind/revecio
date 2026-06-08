import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSession } from '../lib/session.js';
import { renderGate } from '../lib/templates.js';
import { ensureSchema, canEmailAccessDemo } from '../lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_PATH = join(__dirname, '..', 'lib', 'demo.html');
const DEMO_HTML = readFileSync(DEMO_PATH, 'utf8');

function htmlHeaders(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function renderNoDemoAccess() {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Reve CIO - Demo</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f7f5f0; color:#14171c; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:24px; }
  .card { max-width:460px; text-align:center; }
  .mark { font-family:Georgia,serif; font-size:22px; color:#1f7050; letter-spacing:.02em; margin-bottom:18px; }
  h1 { font-size:20px; font-weight:600; margin:0 0 10px; }
  p { font-size:14.5px; line-height:1.6; color:#4a4f57; margin:0 0 8px; }
  a { color:#1f7050; }
</style></head><body>
  <div class="card">
    <div class="mark">Reve</div>
    <h1>Demo access isn't enabled for your account</h1>
    <p>You're signed in, but the interactive demo hasn't been turned on for your email yet.</p>
    <p>Please contact your Reve representative to request access.</p>
  </div>
</body></html>`;
}

export default async function handler(req, res) {
  const session = readSession(req);
  if (!session) {
    res.statusCode = 200;
    htmlHeaders(res);
    return res.end(renderGate({ title: 'Reve CIO - Demo', redirectTo: '/demo', eyebrow: 'Interactive Demo' }));
  }

  // Per-user demo access. Fail open if the DB is unavailable so a transient
  // error never locks out a legitimately signed-in viewer.
  let allowed = true;
  if (session.email) {
    try {
      await ensureSchema();
      allowed = await canEmailAccessDemo(session.email);
    } catch (err) {
      console.error('[demo] access check failed, allowing:', err?.message);
      allowed = true;
    }
  }
  if (!allowed) {
    res.statusCode = 403;
    htmlHeaders(res);
    return res.end(renderNoDemoAccess());
  }

  res.statusCode = 200;
  htmlHeaders(res);
  res.end(DEMO_HTML);
}
