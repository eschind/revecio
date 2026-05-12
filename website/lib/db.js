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
  schemaInitialized = true;
}

async function recordVisit({ email, ip, userAgent, action }) {
  const db = getSql();
  await db`
    INSERT INTO visits (email, ip, user_agent, action)
    VALUES (${email}, ${ip || null}, ${userAgent || null}, ${action})
  `;
}

async function listRecentVisits(limit = 50) {
  const db = getSql();
  return db`SELECT email, ip, user_agent, action, ts FROM visits ORDER BY ts DESC LIMIT ${limit}`;
}

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
    INSERT INTO allowed_emails (email, note)
    VALUES (${normalizeEmail(email)}, ${note || null})
    ON CONFLICT (email) DO UPDATE SET note = ${note || null}
  `;
}

async function removeAllowedEmail(email) {
  const db = getSql();
  await db`DELETE FROM allowed_emails WHERE email = ${normalizeEmail(email)}`;
}

async function countAllowedEmails() {
  const db = getSql();
  const rows = await db`SELECT COUNT(*)::int AS c FROM allowed_emails`;
  return rows[0]?.c ?? 0;
}

export {
  getSql,
  ensureSchema,
  recordVisit,
  listRecentVisits,
  getMemo,
  setMemo,
  isEmailAllowed,
  listAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
  countAllowedEmails,
};
