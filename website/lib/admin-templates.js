function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />`;

const ADMIN_VARS = `
  :root {
    --ink: #14171c;
    --ink-2: #2b3038;
    --muted: #6a6f78;
    --line: #d9d4c7;
    --bg: #f7f5f0;
    --accent: #1a3a2e;
    --dark-bg: #14171c;
    --dark-ink: #f4f1ea;
  }
`;

// ============================================================
// Sign-in (request magic link)
// ============================================================
function renderAdminSignin({ message, error, prefillEmail } = {}) {
  return `<!doctype html><html lang="en"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Reve — Admin</title>
${FONTS}
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>
  ${ADMIN_VARS}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body { background: var(--bg); color: var(--ink); font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.55; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { width: 100%; max-width: 460px; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 36px 36px 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); }
  .brand { font-family: 'Newsreader', serif; font-weight: 400; font-size: 30px; margin: 0 0 4px; }
  .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 0 24px; }
  h1 { font-family: 'Newsreader', serif; font-weight: 300; font-size: 24px; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 6px; }
  .intro { color: var(--ink-2); font-size: 14px; line-height: 1.5; margin: 0 0 22px; }
  form { display: flex; flex-direction: column; gap: 14px; }
  label { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  input { font-family: inherit; font-size: 15px; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 11px 14px; width: 100%; }
  input:focus { outline: none; border-color: var(--ink); background: #fff; box-shadow: 0 0 0 3px rgba(20,23,28,0.08); }
  button { margin-top: 6px; appearance: none; background: var(--ink); color: var(--bg); border: none; font: inherit; font-size: 15px; font-weight: 500; padding: 12px 20px; border-radius: 999px; cursor: pointer; }
  button:hover { background: var(--accent); }
  .message { padding: 10px 14px; border-radius: 8px; font-size: 13.5px; margin: 0 0 16px; }
  .message.ok { background: #e7efe9; color: #1a3a2e; border: 1px solid #c5d8cc; }
  .message.err { background: #f4e4e0; color: #8b2c1d; border: 1px solid #e0c5be; }
</style>
</head><body>
  <div class="card">
    <div class="brand">Reve</div>
    <p class="eyebrow">Admin</p>
    <h1>Sign in.</h1>
    <p class="intro">Enter your admin email. We'll send you a one-time sign-in link.</p>
    ${error ? `<div class="message err">${escapeHtml(error)}</div>` : ''}
    ${message ? `<div class="message ok">${escapeHtml(message)}</div>` : ''}
    <form method="POST" action="/investors/admin" autocomplete="on">
      <input type="hidden" name="action" value="request-link" />
      <label>
        <span class="field-label">Email</span>
        <input type="email" name="email" required autocomplete="email" autofocus value="${prefillEmail ? escapeHtml(prefillEmail) : ''}" />
      </label>
      <button type="submit">Send sign-in link</button>
    </form>
  </div>
</body></html>`;
}

// ============================================================
// Dashboard
// ============================================================
function renderAdminDashboard({ adminEmail, memo, allowedEmails, visits, whitelistEnabled, savedMessage }) {
  const memoJson = JSON.stringify(memo).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Reve — Admin</title>
${FONTS}
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>
  ${ADMIN_VARS}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--ink); font-family: 'Inter', sans-serif; font-size: 14.5px; line-height: 1.55; }
  .topbar { position: sticky; top: 0; z-index: 50; background: rgba(20,23,28,0.97); color: var(--dark-ink); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .tb-left { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
  .tb-title { font-family: 'Newsreader', serif; font-size: 19px; }
  .tb-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(244,241,234,0.6); }
  .tb-right { display: flex; align-items: center; gap: 12px; }
  .tb-status { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(244,241,234,0.55); min-width: 90px; text-align: right; }
  .tb-btn { appearance: none; background: transparent; color: var(--dark-ink); border: 1px solid rgba(244,241,234,0.2); font: inherit; font-size: 12.5px; padding: 7px 14px; border-radius: 999px; cursor: pointer; text-decoration: none; }
  .tb-btn:hover { background: rgba(244,241,234,0.08); border-color: rgba(244,241,234,0.45); }

  main { max-width: 1100px; margin: 0 auto; padding: 36px 24px 80px; display: flex; flex-direction: column; gap: 44px; }
  section.panel { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 28px 32px; }
  section.panel + section.panel { margin-top: 0; }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
  .panel-head h2 { font-family: 'Newsreader', serif; font-weight: 400; font-size: 22px; letter-spacing: -0.01em; margin: 0; }
  .panel-head .meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
  .panel p.desc { color: var(--ink-2); font-size: 13.5px; margin: 0 0 16px; max-width: 70ch; }
  .saved-pill { padding: 6px 12px; border-radius: 999px; background: #e7efe9; color: #1a3a2e; font-size: 12px; border: 1px solid #c5d8cc; margin-bottom: 14px; display: inline-block; }

  /* meta input */
  .meta-row { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .meta-row label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
  .meta-row input { font-family: inherit; font-size: 14px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); width: 100%; max-width: 600px; }
  .meta-row input:focus { outline: none; border-color: var(--ink); background: #fff; box-shadow: 0 0 0 3px rgba(20,23,28,0.06); }

  /* memo editor */
  .editor-pages { display: flex; flex-direction: column; gap: 22px; }
  .editor-page { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .editor-page-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg); border-bottom: 1px solid var(--line); }
  .editor-page-title { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .editor-section { padding: 18px 22px; }
  .editor-section + .editor-section { border-top: 1px dashed var(--line); }
  .editor-section-label { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  .editor-content { min-height: 80px; outline: none; border: 1px dashed transparent; border-radius: 6px; padding: 6px; transition: border-color 0.15s, background 0.15s; }
  .editor-content:hover { border-color: rgba(26,58,46,0.2); }
  .editor-content:focus { border-color: rgba(26,58,46,0.6); background: rgba(26,58,46,0.04); }
  .editor-content h2, .editor-content h3, .editor-content h4 { font-family: 'Newsreader', serif; }
  .editor-content .stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin: 12px 0; }
  .editor-content .stat { padding: 12px 18px; border-right: 1px solid var(--line); }
  .editor-content .stat:last-child { border-right: none; }
  .editor-content .stat-num { font-family: 'Newsreader', serif; font-size: 22px; }
  .editor-content .stat-label { font-size: 12px; color: var(--muted); }
  .editor-content .callout { background: var(--dark-bg); color: var(--dark-ink); padding: 12px 16px; border-radius: 6px; margin: 10px 0; }
  .editor-content .callout h3 { color: var(--dark-ink); font-size: 15px; margin: 0 0 4px; }
  .editor-content .callout p { color: rgba(244,241,234,0.85); margin: 0; font-size: 13px; }
  .editor-content .callout p + p { margin-top: 6px; }
  .editor-content .pillars { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 22px; }
  .editor-content .pillar h4 { font-family: 'Newsreader', serif; font-size: 14px; margin: 0 0 2px; }
  .editor-content .pillar p { font-size: 12.5px; margin: 0; color: var(--ink-2); }
  .editor-content .lede { font-family: 'Newsreader', serif; font-weight: 300; font-size: 22px; line-height: 1.2; letter-spacing: -0.01em; }
  .editor-content ul { padding-left: 18px; }
  .editor-content a { color: var(--ink); text-decoration: underline; }

  /* whitelist */
  .wl-toggle { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .wl-toggle-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .wl-toggle-status { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; letter-spacing: 0.08em; }
  .wl-toggle-status.on { background: #e7efe9; color: #1a3a2e; border: 1px solid #c5d8cc; }
  .wl-toggle-status.off { background: #efeae0; color: #7a6a3a; border: 1px solid #d8cdb0; }
  .wl-toggle-explanation { font-size: 12.5px; color: var(--muted); flex: 1; min-width: 200px; }
  .wl-toggle form { margin: 0; }
  .wl-add-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
  .wl-locked { opacity: 0.55; pointer-events: none; }
  .wl-add-form input { padding: 9px 12px; font: inherit; font-size: 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); }
  .wl-add-form input:focus { outline: none; border-color: var(--ink); background: #fff; }
  .wl-add-form input[name="email"] { width: 280px; }
  .wl-add-form input[name="note"] { width: 220px; }
  .btn { appearance: none; background: var(--ink); color: var(--bg); border: none; font: inherit; font-size: 13px; font-weight: 500; padding: 9px 16px; border-radius: 999px; cursor: pointer; }
  .btn:hover { background: var(--accent); }
  .btn-danger { background: transparent; color: #8b2c1d; border: 1px solid rgba(139,44,29,0.3); padding: 4px 12px; font-size: 12px; }
  .btn-danger:hover { background: #f4e4e0; border-color: #8b2c1d; }
  .wl-list { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--line); }
  .wl-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
  .wl-list .wl-email { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
  .wl-list .wl-note { color: var(--muted); font-size: 12.5px; flex: 1; }
  .wl-empty { color: var(--muted); font-size: 13px; font-style: italic; padding: 8px 0; }

  /* visits */
  .visits-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .visits-table th { text-align: left; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); padding: 8px 10px 8px 0; border-bottom: 1px solid var(--line); }
  .visits-table td { padding: 8px 10px 8px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  .visits-table td.action { font-family: 'JetBrains Mono', monospace; font-size: 11px; text-transform: uppercase; color: var(--muted); }
  .visits-table td.ip { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--muted); }
  .visits-table td.email { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; }
  .visits-empty { color: var(--muted); font-size: 13px; font-style: italic; }

  /* link popover (same as memo editor) */
  .link-popover { position: fixed; z-index: 100; background: var(--ink); color: var(--dark-ink); border-radius: 10px; padding: 10px; display: none; align-items: center; gap: 6px; box-shadow: 0 12px 40px rgba(0,0,0,0.35); }
  .link-popover.open { display: flex; }
  .link-popover input { background: rgba(244,241,234,0.08); color: var(--dark-ink); border: 1px solid rgba(244,241,234,0.18); border-radius: 6px; padding: 7px 10px; font: inherit; font-size: 13px; width: 280px; outline: none; }
  .link-popover .lp-btn { background: var(--dark-ink); color: var(--ink); border: none; font: inherit; font-size: 12.5px; padding: 7px 12px; border-radius: 6px; cursor: pointer; }
  .link-popover .lp-btn.secondary { background: transparent; color: rgba(244,241,234,0.7); border: 1px solid rgba(244,241,234,0.18); }
</style>
</head><body>
  <div class="topbar">
    <div class="tb-left">
      <span class="tb-title">Reve · Admin</span>
      <span class="tb-eyebrow">${escapeHtml(adminEmail)}</span>
    </div>
    <div class="tb-right">
      <span class="tb-status" id="save-status"></span>
      <a class="tb-btn" href="/investors" target="_blank">View memo →</a>
      <a class="tb-btn" href="/investors/admin?signout=1">Sign out</a>
    </div>
  </div>

  <main>
    <!-- ====== Memo editor ====== -->
    <section class="panel">
      <div class="panel-head">
        <h2>Memo content</h2>
        <span class="meta">Auto-saves to /investors</span>
      </div>
      ${savedMessage ? `<div class="saved-pill">${escapeHtml(savedMessage)}</div>` : ''}
      <p class="desc">Click any text below to edit. Changes are saved to the live site after a short pause. Use Cmd+K to add or edit a link on selected text.</p>

      <div class="meta-row">
        <label for="memo-meta">Meta line</label>
        <input type="text" id="memo-meta" placeholder="Investor Memo · Confidential · {date}" />
      </div>

      <div class="editor-pages" id="editor-pages"></div>
    </section>

    <!-- ====== Whitelist ====== -->
    <section class="panel">
      <div class="panel-head">
        <h2>Allowed emails</h2>
        <span class="meta">${allowedEmails.length} on the list</span>
      </div>

      <div class="wl-toggle">
        <span class="wl-toggle-label">Whitelist gate</span>
        <span class="wl-toggle-status ${whitelistEnabled ? 'on' : 'off'}">${whitelistEnabled ? 'ON' : 'OFF'}</span>
        <span class="wl-toggle-explanation">${whitelistEnabled
          ? 'Only listed emails (plus your admin email) can sign in at /investors.'
          : 'Anyone with the access code can sign in — the list below is paused.'}</span>
        <form method="POST" action="/investors/admin">
          <input type="hidden" name="action" value="toggle-whitelist" />
          <input type="hidden" name="enabled" value="${whitelistEnabled ? 'false' : 'true'}" />
          <button class="btn" type="submit">${whitelistEnabled ? 'Disable' : 'Enable'}</button>
        </form>
      </div>

      <p class="desc">Manage the list of emails allowed at /investors. Your admin email always has access regardless of this list.</p>
      <form class="wl-add-form" method="POST" action="/investors/admin">
        <input type="hidden" name="action" value="add-email" />
        <input type="email" name="email" required placeholder="investor@example.com" autocomplete="off" />
        <input type="text" name="note" placeholder="Note (optional)" autocomplete="off" />
        <button class="btn" type="submit">Add to whitelist</button>
      </form>
      <ul class="wl-list">
        ${allowedEmails.length === 0 ? '<li class="wl-empty">No emails added yet. Add one above.</li>' : ''}
        ${allowedEmails.map((e) => `
          <li>
            <span class="wl-email">${escapeHtml(e.email)}</span>
            <span class="wl-note">${e.note ? escapeHtml(e.note) : ''}</span>
            <form method="POST" action="/investors/admin" style="margin:0">
              <input type="hidden" name="action" value="remove-email" />
              <input type="hidden" name="email" value="${escapeHtml(e.email)}" />
              <button class="btn-danger" type="submit">Remove</button>
            </form>
          </li>
        `).join('')}
      </ul>
    </section>

    <!-- ====== Visits ====== -->
    <section class="panel">
      <div class="panel-head">
        <h2>Recent activity</h2>
        <span class="meta">Last ${visits.length} events</span>
      </div>
      ${visits.length === 0 ? '<p class="visits-empty">No visits yet.</p>' : `
        <table class="visits-table">
          <thead><tr><th>When</th><th>Email</th><th>Action</th><th>IP</th></tr></thead>
          <tbody>
          ${visits.map((v) => `
            <tr>
              <td>${escapeHtml(new Date(v.ts).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }))} ET</td>
              <td class="email">${escapeHtml(v.email)}</td>
              <td class="action">${escapeHtml(v.action)}</td>
              <td class="ip">${escapeHtml(v.ip || '—')}</td>
            </tr>
          `).join('')}
          </tbody>
        </table>
      `}
    </section>
  </main>

  <!-- Link popover (Cmd+K) -->
  <div class="link-popover" id="link-popover" role="dialog" aria-label="Add link">
    <input type="url" id="link-url" placeholder="https://linkedin.com/in/..." autocomplete="off" spellcheck="false" />
    <button class="lp-btn" id="lp-apply">Apply</button>
    <button class="lp-btn secondary" id="lp-remove">Remove</button>
    <button class="lp-btn secondary" id="lp-cancel">Cancel</button>
  </div>

<script>
const initialMemo = ${memoJson};

(function () {
  const memoState = JSON.parse(JSON.stringify(initialMemo));
  const metaInput = document.getElementById('memo-meta');
  metaInput.value = memoState.meta || '';

  const pagesEl = document.getElementById('editor-pages');
  pagesEl.innerHTML = memoState.pages.map((p, i) => \`
    <div class="editor-page">
      <div class="editor-page-head">
        <span class="editor-page-title">Page \${i + 1}</span>
        <span class="editor-page-title">\${p.closing ? 'body + closing' : 'body'}</span>
      </div>
      <div class="editor-section">
        <div class="editor-section-label">Body</div>
        <div class="editor-content" contenteditable="true" data-page="\${i}" data-field="body"></div>
      </div>
      \${p.closing != null ? \`
        <div class="editor-section">
          <div class="editor-section-label">Closing</div>
          <div class="editor-content" contenteditable="true" data-page="\${i}" data-field="closing"></div>
        </div>
      \` : ''}
    </div>
  \`).join('');

  // Populate contents
  document.querySelectorAll('.editor-content').forEach(el => {
    const pageIdx = parseInt(el.dataset.page, 10);
    const field = el.dataset.field;
    el.innerHTML = memoState.pages[pageIdx][field] || '';
  });

  const status = document.getElementById('save-status');
  let saveTimer = null;
  let inflight = false;
  let queued = false;

  function setStatus(msg) { status.textContent = msg; }

  function buildPayload() {
    document.querySelectorAll('.editor-content').forEach(el => {
      const pageIdx = parseInt(el.dataset.page, 10);
      const field = el.dataset.field;
      memoState.pages[pageIdx][field] = el.innerHTML;
    });
    memoState.meta = metaInput.value;
    return memoState;
  }

  async function flushSave() {
    if (inflight) { queued = true; return; }
    inflight = true;
    setStatus('Saving…');
    const payload = buildPayload();
    try {
      const res = await fetch('/api/investors/admin-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setStatus('Saved · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setStatus('Save failed');
      console.error(err);
    } finally {
      inflight = false;
      if (queued) { queued = false; flushSave(); }
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 600);
  }

  pagesEl.addEventListener('input', scheduleSave);
  metaInput.addEventListener('input', scheduleSave);

  // Block Enter inside contenteditables outside lists — Shift+Enter inserts <br>
  pagesEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const el = e.target;
    if (el && el.closest && el.closest('li')) return;
    e.preventDefault();
  });

  // Link popover
  const popover = document.getElementById('link-popover');
  const linkInput = document.getElementById('link-url');
  const lpApply = document.getElementById('lp-apply');
  const lpRemove = document.getElementById('lp-remove');
  const lpCancel = document.getElementById('lp-cancel');
  let savedRange = null;
  let editingAnchor = null;

  function getSelectionInfo() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const host = (container.nodeType === 1 ? container : container.parentElement).closest('.editor-content');
    if (!host) return null;
    const node = container.nodeType === 1 ? container : container.parentElement;
    return { sel, range, host, anchor: node.closest('a') };
  }
  function openPopover() {
    const info = getSelectionInfo();
    if (!info) { setStatus('Select text first'); return; }
    savedRange = info.range.cloneRange();
    editingAnchor = info.anchor;
    const rect = info.range.getBoundingClientRect();
    const popW = 540;
    const top = Math.max(80, rect.top - 56);
    let left = rect.left + rect.width / 2 - popW / 2;
    left = Math.max(12, Math.min(window.innerWidth - popW - 12, left));
    popover.style.top = top + 'px';
    popover.style.left = left + 'px';
    popover.classList.add('open');
    linkInput.value = editingAnchor ? editingAnchor.getAttribute('href') || '' : '';
    lpRemove.style.display = editingAnchor ? '' : 'none';
    setTimeout(() => { linkInput.focus(); linkInput.select(); }, 10);
  }
  function closePopover() { popover.classList.remove('open'); savedRange = null; editingAnchor = null; }
  function normalizeUrl(v) {
    v = (v || '').trim();
    if (!v) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !v.startsWith('#') && !v.startsWith('mailto:')) v = 'https://' + v;
    return v;
  }
  function restoreSelection() {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
  lpApply.addEventListener('click', () => {
    const url = normalizeUrl(linkInput.value);
    if (!url) { closePopover(); return; }
    restoreSelection();
    if (editingAnchor) {
      editingAnchor.setAttribute('href', url);
      editingAnchor.setAttribute('target', '_blank');
      editingAnchor.setAttribute('rel', 'noopener');
    } else {
      document.execCommand('createLink', false, url);
      const info = getSelectionInfo();
      if (info) {
        info.host.querySelectorAll('a[href="' + CSS.escape(url) + '"]').forEach(a => {
          if (!a.getAttribute('target')) a.setAttribute('target', '_blank');
          if (!a.getAttribute('rel')) a.setAttribute('rel', 'noopener');
        });
      }
    }
    closePopover();
    scheduleSave();
  });
  lpRemove.addEventListener('click', () => {
    restoreSelection();
    if (editingAnchor) {
      const parent = editingAnchor.parentNode;
      while (editingAnchor.firstChild) parent.insertBefore(editingAnchor.firstChild, editingAnchor);
      parent.removeChild(editingAnchor);
    } else {
      document.execCommand('unlink');
    }
    closePopover();
    scheduleSave();
  });
  lpCancel.addEventListener('click', closePopover);
  linkInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); lpApply.click(); }
    if (e.key === 'Escape') { e.preventDefault(); closePopover(); }
  });
  document.addEventListener('mousedown', (e) => {
    if (!popover.classList.contains('open')) return;
    if (e.target.closest('#link-popover')) return;
    closePopover();
  });
  document.addEventListener('keydown', (e) => {
    const cmd = e.metaKey || e.ctrlKey;
    if (cmd && (e.key === 'k' || e.key === 'K')) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && (sel.getRangeAt(0).commonAncestorContainer.nodeType === 1 ? sel.getRangeAt(0).commonAncestorContainer : sel.getRangeAt(0).commonAncestorContainer.parentElement).closest('.editor-content')) {
        e.preventDefault();
        openPopover();
      }
    }
  });
})();
</script>
</body></html>`;
}

export { renderAdminSignin, renderAdminDashboard };
