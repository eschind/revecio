import postgres from 'postgres';

let sql;
function getSql() {
  if (sql) return sql;
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!url) throw new Error('DATABASE_URL not configured');
  sql = postgres(url, { ssl: 'require', max: 1, idle_timeout: 20 });
  return sql;
}

let schemaInitialized = false;
async function ensureSchema() {
  if (schemaInitialized) return;
  const db = getSql();
  await db`
    CREATE TABLE IF NOT EXISTS visits (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      action TEXT NOT NULL,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS visits_ts_idx ON visits (ts DESC)`;
  await db`CREATE INDEX IF NOT EXISTS visits_email_idx ON visits (email)`;
  await db`ALTER TABLE visits ADD COLUMN IF NOT EXISTS document_slug TEXT`;
  await db`ALTER TABLE visits ADD COLUMN IF NOT EXISTS document_title TEXT`;

  await db`
    CREATE TABLE IF NOT EXISTS memo_content (
      id INTEGER PRIMARY KEY DEFAULT 1,
      content JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (id = 1)
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS allowed_emails (
      email TEXT PRIMARY KEY,
      note TEXT,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content JSONB NOT NULL,
      visible BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS documents_sort_idx ON documents (sort_order, id)`;

  // One-time migration: move the old singleton memo_content into the documents table
  const docs = await db`SELECT COUNT(*)::int AS c FROM documents`;
  if (docs[0].c === 0) {
    const memoRow = await db`SELECT content FROM memo_content WHERE id = 1`;
    if (memoRow.length > 0) {
      await db`
        INSERT INTO documents (slug, title, content, visible, sort_order)
        VALUES ('memo', 'Investor Memo', ${db.json(memoRow[0].content)}, TRUE, 0)
        ON CONFLICT (slug) DO NOTHING
      `;
    }
  }

  // Backfill: any pre-multi-doc visit/download events have NULL document_slug.
  // Attribute them to the oldest document (which is the migrated memo).
  // Idempotent — running again is a no-op because there are no more NULL rows.
  await db`
    UPDATE visits
    SET document_slug = d.slug, document_title = d.title
    FROM (SELECT slug, title FROM documents ORDER BY sort_order, id LIMIT 1) d
    WHERE visits.document_slug IS NULL
      AND visits.action IN ('view', 'download')
  `;

  schemaInitialized = true;
}

// Internal emails whose visits/downloads should not be tracked or surfaced.
const INTERNAL_EMAILS = ['eschindelhaim@gmail.com', 'eytan@piratehat.ai'];

async function recordVisit({ email, ip, userAgent, action, documentSlug, documentTitle }) {
  if (INTERNAL_EMAILS.includes((email || '').toLowerCase())) return;
  const db = getSql();
  await db`
    INSERT INTO visits (email, ip, user_agent, action, document_slug, document_title)
    VALUES (${email}, ${ip || null}, ${userAgent || null}, ${action}, ${documentSlug || null}, ${documentTitle || null})
  `;
}

async function listRecentVisits(limit = 50) {
  const db = getSql();
  return db`SELECT email, ip, user_agent, action, ts, document_slug, document_title FROM visits WHERE NOT (email = ANY(${INTERNAL_EMAILS})) ORDER BY ts DESC LIMIT ${limit}`;
}

async function deleteInternalVisits() {
  const db = getSql();
  await db`DELETE FROM visits WHERE email = ANY(${INTERNAL_EMAILS})`;
}

// ----- legacy memo helpers retained for backwards compat -----
async function getMemo() {
  const db = getSql();
  const rows = await db`SELECT content, updated_at FROM memo_content WHERE id = 1`;
  return rows[0] || null;
}
async function setMemo(content) {
  const db = getSql();
  await db`
    INSERT INTO memo_content (id, content, updated_at)
    VALUES (1, ${db.json(content)}, NOW())
    ON CONFLICT (id) DO UPDATE SET content = ${db.json(content)}, updated_at = NOW()
  `;
}

// ----- documents -----
async function listDocuments({ visibleOnly = false } = {}) {
  const db = getSql();
  if (visibleOnly) {
    return db`SELECT id, slug, title, visible, sort_order, updated_at FROM documents WHERE visible = TRUE ORDER BY sort_order, id`;
  }
  return db`SELECT id, slug, title, visible, sort_order, updated_at FROM documents ORDER BY sort_order, id`;
}

async function getDocumentBySlug(slug) {
  const db = getSql();
  const rows = await db`SELECT id, slug, title, content, visible, sort_order, updated_at FROM documents WHERE slug = ${slug}`;
  return rows[0] || null;
}

async function createDocument({ slug, title, content }) {
  const db = getSql();
  const rows = await db`
    INSERT INTO documents (slug, title, content, visible, sort_order)
    SELECT ${slug}, ${title}, ${db.json(content)}, TRUE,
           COALESCE((SELECT MAX(sort_order) + 1 FROM documents), 0)
    RETURNING id, slug, title, visible, sort_order
  `;
  return rows[0];
}

async function updateDocument(slug, { title, content }) {
  const db = getSql();
  if (title != null && content != null) {
    await db`UPDATE documents SET title = ${title}, content = ${db.json(content)}, updated_at = NOW() WHERE slug = ${slug}`;
  } else if (title != null) {
    await db`UPDATE documents SET title = ${title}, updated_at = NOW() WHERE slug = ${slug}`;
  } else if (content != null) {
    await db`UPDATE documents SET content = ${db.json(content)}, updated_at = NOW() WHERE slug = ${slug}`;
  }
}

async function setDocumentVisible(slug, visible) {
  const db = getSql();
  await db`UPDATE documents SET visible = ${Boolean(visible)}, updated_at = NOW() WHERE slug = ${slug}`;
}

async function deleteDocument(slug) {
  const db = getSql();
  await db`DELETE FROM documents WHERE slug = ${slug}`;
}

async function renameDocumentSlug(oldSlug, newSlug) {
  const db = getSql();
  await db`UPDATE documents SET slug = ${newSlug}, updated_at = NOW() WHERE slug = ${oldSlug}`;
}

// ----- whitelist -----
const normalizeEmail = (e) => String(e || '').trim().toLowerCase();
async function isEmailAllowed(email) {
  const db = getSql();
  const rows = await db`SELECT 1 FROM allowed_emails WHERE email = ${normalizeEmail(email)}`;
  return rows.length > 0;
}
async function listAllowedEmails() {
  const db = getSql();
  return db`SELECT email, note, added_at FROM allowed_emails ORDER BY added_at DESC`;
}
async function addAllowedEmail(email, note) {
  const db = getSql();
  await db`
    INSERT INTO allowed_emails (email, note) VALUES (${normalizeEmail(email)}, ${note || null})
    ON CONFLICT (email) DO UPDATE SET note = ${note || null}
  `;
}
async function removeAllowedEmail(email) {
  const db = getSql();
  await db`DELETE FROM allowed_emails WHERE email = ${normalizeEmail(email)}`;
}

// ----- settings -----
async function getSetting(key, defaultValue = null) {
  const db = getSql();
  const rows = await db`SELECT value FROM settings WHERE key = ${key}`;
  if (rows.length === 0) return defaultValue;
  return rows[0].value;
}
async function setSetting(key, value) {
  const db = getSql();
  await db`
    INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${db.json(value)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${db.json(value)}, updated_at = NOW()
  `;
}
async function isWhitelistEnabled() {
  const v = await getSetting('whitelist_enabled', true);
  return v !== false;
}
async function setWhitelistEnabled(enabled) {
  await setSetting('whitelist_enabled', Boolean(enabled));
}
async function isDeckVisible() {
  const v = await getSetting('deck_visible', true);
  return v !== false;
}
async function setDeckVisible(visible) {
  await setSetting('deck_visible', Boolean(visible));
}

export {
  getSql,
  ensureSchema,
  recordVisit,
  listRecentVisits,
  deleteInternalVisits,
  // legacy
  getMemo,
  setMemo,
  // documents
  listDocuments,
  getDocumentBySlug,
  createDocument,
  updateDocument,
  setDocumentVisible,
  deleteDocument,
  renameDocumentSlug,
  // whitelist
  isEmailAllowed,
  listAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
  // settings
  getSetting,
  setSetting,
  isWhitelistEnabled,
  setWhitelistEnabled,
  isDeckVisible,
  setDeckVisible,
};
