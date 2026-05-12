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
  schemaInitialized = true;
}

async function recordVisit({ email, ip, userAgent, action }) {
  const db = getSql();
  await db`
    INSERT INTO visits (email, ip, user_agent, action)
    VALUES (${email}, ${ip || null}, ${userAgent || null}, ${action})
  `;
}

export { getSql, ensureSchema, recordVisit };
