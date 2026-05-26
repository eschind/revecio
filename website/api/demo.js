import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSession } from '../lib/session.js';
import { renderGate } from '../lib/templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_PATH = join(__dirname, '..', 'lib', 'demo.html');
const DEMO_HTML = readFileSync(DEMO_PATH, 'utf8');

export default async function handler(req, res) {
  const session = readSession(req);
  if (!session) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.end(renderGate({ title: 'Reve CIO - Demo' }));
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(DEMO_HTML);
}
