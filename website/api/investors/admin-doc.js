import { readAdminSession } from '../../lib/session.js';
import { ensureSchema, getDocumentBySlug, updateDocument } from '../../lib/db.js';
import { saveDocumentContent } from '../../lib/doc-store.js';

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
    return res.end(JSON.stringify({ error: 'Sign in to edit.' }));
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
    const slug = String(body.slug || '').trim();
    const title = body.title != null ? String(body.title).trim() : null;
    const content = body.content;
    if (!slug) throw new Error('slug is required');
    const existing = await getDocumentBySlug(slug);
    if (!existing) throw new Error('Document not found');

    if (content != null) await saveDocumentContent(slug, content);
    if (title != null && title !== existing.title) {
      await updateDocument(slug, { title });
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
  } catch (err) {
    console.error('[admin-doc] save failed:', err?.message);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Save failed' }));
  }
}
