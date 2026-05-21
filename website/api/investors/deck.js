import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSession, clientIp } from '../../lib/session.js';
import { ensureSchema, recordVisit, isDeckVisible } from '../../lib/db.js';
import { renderGate } from '../../lib/templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DECK_PATH = join(__dirname, '..', '..', 'lib', 'deck.html');
const DECK_HTML = readFileSync(DECK_PATH, 'utf8');

export default async function handler(req, res) {
  const session = readSession(req);
  if (!session) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.end(renderGate());
  }
  try {
    await ensureSchema();
    if (!(await isDeckVisible())) {
      res.statusCode = 302;
      res.setHeader('Location', '/investors');
      return res.end();
    }
    await recordVisit({
      email: session.email,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'] || '',
      action: 'view',
      documentSlug: 'deck',
      documentTitle: 'Investor deck',
    });
  } catch (err) {
    console.error('[deck] view log failed:', err?.message);
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(DECK_HTML);
}
