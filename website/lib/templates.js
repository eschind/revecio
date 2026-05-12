import { DEFAULT_MEMO } from './memo-content.js';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
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

const BASE_VARS = `
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
// Gate page
// ============================================================
function renderGate({ error, prefillEmail } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<title>Reve — Investor Memo</title>
${FONTS}
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>
  ${BASE_VARS}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    background: var(--bg);
    color: var(--ink);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    width: 100%;
    max-width: 460px;
    background: white;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 36px 36px 32px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.06);
  }
  .brand {
    font-family: 'Newsreader', serif;
    font-weight: 400;
    font-size: 30px;
    letter-spacing: 0.005em;
    color: var(--ink);
    margin: 0 0 4px;
  }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 24px;
  }
  h1 {
    font-family: 'Newsreader', serif;
    font-weight: 300;
    font-size: 24px;
    line-height: 1.2;
    letter-spacing: -0.01em;
    margin: 0 0 6px;
    color: var(--ink);
  }
  .intro {
    color: var(--ink-2);
    font-size: 14px;
    line-height: 1.5;
    margin: 0 0 22px;
  }
  form { display: flex; flex-direction: column; gap: 14px; }
  label { display: flex; flex-direction: column; gap: 6px; }
  .field-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  input {
    font-family: inherit;
    font-size: 15px;
    color: var(--ink);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 11px 14px;
    width: 100%;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }
  input:focus {
    outline: none;
    border-color: var(--ink);
    background: white;
    box-shadow: 0 0 0 3px rgba(20,23,28,0.08);
  }
  button {
    margin-top: 6px;
    appearance: none;
    background: var(--ink);
    color: var(--bg);
    border: none;
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    padding: 12px 20px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s;
  }
  button:hover { background: var(--accent); }
  .error {
    background: #f4e4e0;
    color: #8b2c1d;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13.5px;
    margin: 0 0 16px;
    border: 1px solid #e0c5be;
  }
  .meta-foot {
    margin-top: 22px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">Reve</div>
    <p class="eyebrow">Investor Memo</p>
    <h1>A private overview.</h1>
    <p class="intro">Please enter the access code shared with you, along with your email.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="/investors" autocomplete="on" novalidate>
      <label>
        <span class="field-label">Email</span>
        <input type="email" name="email" required autocomplete="email" autofocus value="${prefillEmail ? escapeHtml(prefillEmail) : ''}" />
      </label>
      <label>
        <span class="field-label">Access code</span>
        <input type="password" name="password" required autocomplete="current-password" />
      </label>
      <button type="submit">Continue</button>
    </form>
    <p class="meta-foot">This page is confidential. By continuing you agree that the information you access here is shared in confidence and intended solely for your evaluation.</p>
  </div>
</body>
</html>`;
}

// ============================================================
// Memo page — uses DEFAULT_MEMO model
// ============================================================
function renderMemoCss() {
  return `${BASE_VARS}
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: letter; margin: 0; }
  html, body { margin: 0; padding: 0; background: #e9e6df; color: var(--ink); font-family: 'Inter', sans-serif; font-size: 10pt; line-height: 1.45; }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(20,23,28,0.96);
    backdrop-filter: blur(10px);
    color: var(--dark-ink);
    padding: 10px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    font-size: 13px;
  }
  .topbar .tb-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .topbar .tb-title { font-family: 'Newsreader', serif; font-size: 17px; }
  .topbar .tb-hint { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(244,241,234,0.6); }
  .tb-btn {
    appearance: none;
    background: var(--dark-ink);
    color: var(--ink);
    border: 1px solid var(--dark-ink);
    font: inherit;
    font-size: 12.5px;
    padding: 7px 14px;
    border-radius: 999px;
    cursor: pointer;
  }
  .tb-btn:hover { background: white; }
  .tb-btn.ghost { background: transparent; color: var(--dark-ink); border-color: rgba(244,241,234,0.2); }
  .tb-btn.ghost:hover { border-color: rgba(244,241,234,0.5); background: rgba(244,241,234,0.06); }
  @media print { .topbar { display: none !important; } }

  .page {
    width: 8.5in;
    min-height: 11in;
    padding: 0.5in 0.6in 0.4in;
    background: var(--bg);
    page-break-after: always;
    overflow: hidden;
    margin: 18px auto;
    box-shadow: 0 10px 40px rgba(0,0,0,0.12);
    display: flex;
    flex-direction: column;
  }
  .page-body { flex: 1 1 auto; min-height: 0; overflow: hidden; }
  .page > .header, .page > .closing, .page > .footer { flex-shrink: 0; }
  .page:last-child { page-break-after: auto; }
  @media print {
    body { background: white; }
    .page { margin: 0; box-shadow: none; height: 11in; min-height: 11in; }
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 18px;
  }
  .logo { font-family: 'Newsreader', serif; font-size: 22pt; font-weight: 400; }
  .meta { font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
  .footer {
    padding-top: 10px; margin-top: 10px;
    border-top: 1px solid var(--line);
    display: flex; justify-content: space-between;
    font-family: 'JetBrains Mono', monospace; font-size: 7pt; color: var(--muted);
    letter-spacing: 0.08em; text-transform: uppercase;
  }

  .lede {
    font-family: 'Newsreader', serif; font-weight: 300;
    font-size: 19pt; line-height: 1.18; letter-spacing: -0.015em;
    color: var(--ink); margin: 0 0 14px;
  }
  .lede em { font-style: italic; }

  h2 {
    font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted);
    margin: 16px 0 5px; display: flex; align-items: baseline; gap: 8px;
  }
  h2 .num { color: var(--ink); font-weight: 600; }
  h2 + p { margin-top: 0; }
  p { margin: 0 0 8px; color: var(--ink-2); }
  p strong { color: var(--ink); font-weight: 600; }
  ul { margin: 4px 0 8px; padding-left: 16px; color: var(--ink-2); }
  ul li { margin-bottom: 3px; padding-left: 2px; }
  ul li strong { color: var(--ink); font-weight: 600; }

  .stats {
    display: grid; grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    margin: 12px 0 14px;
  }
  .stat { padding: 12px 22px; border-right: 1px solid var(--line); }
  .stat:first-child { padding-left: 0; }
  .stat:last-child { border-right: none; padding-right: 0; }
  .stat-num { font-family: 'Newsreader', serif; font-size: 22pt; font-weight: 400; line-height: 1; letter-spacing: -0.01em; color: var(--ink); }
  .stat-label { font-size: 8.5pt; color: var(--muted); line-height: 1.4; margin-top: 4px; }

  .callout { background: var(--dark-bg); color: var(--dark-ink); padding: 10px 16px; border-radius: 6px; margin: 8px 0 10px; }
  .callout h3 { font-family: 'Newsreader', serif; font-weight: 400; font-size: 11pt; margin: 0 0 4px; color: var(--dark-ink); }
  .callout p { color: rgba(244,241,234,0.82); margin: 0; font-size: 9.5pt; line-height: 1.5; }
  .callout p + p { margin-top: 6px; }
  .callout strong { color: var(--dark-ink); }

  .pillars { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 22px; margin-top: 8px; }
  .pillar h4 { font-family: 'Newsreader', serif; font-weight: 500; font-size: 10.5pt; margin: 0 0 2px; color: var(--ink); }
  .pillar p { font-size: 9pt; line-height: 1.45; margin: 0; }

  .closing { margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--line); }
  .closing p { font-size: 9.5pt; }
  .small { font-size: 9pt; }
  a { color: var(--ink); text-decoration: underline; text-decoration-color: rgba(20,23,28,0.4); text-underline-offset: 2px; }
  a:hover { color: var(--accent); }
  `;
}

function renderStats(stats) {
  if (!stats) return '';
  return `<div class="stats">${stats.map(([n, l]) => `<div class="stat"><div class="stat-num">${n}</div><div class="stat-label">${l}</div></div>`).join('')}</div>`;
}
function renderPillars(pillars) {
  if (!pillars) return '';
  return `<div class="pillars">${pillars.map(([h, b]) => `<div class="pillar"><h4>${h}</h4><p>${b}</p></div>`).join('')}</div>`;
}
function renderCallout(callout) {
  if (!callout) return '';
  return `<div class="callout"><h3>${callout.title}</h3>${callout.body}</div>`;
}
function renderSection(s) {
  return `<h2><span class="num">${s.num}</span> <span>${s.label}</span></h2>
    ${s.body || ''}
    ${renderStats(s.stats)}
    ${renderCallout(s.callout)}
    ${renderPillars(s.pillars)}`;
}
function renderPage(p, { pageNum, total, meta }) {
  const ledeHtml = p.lede ? `<p class="lede">${p.lede}</p>` : '';
  const closingHtml = p.closing
    ? `<div class="closing"><p>${p.closing.line}</p>${p.closing.contact ? `<p class="small">${p.closing.contact}</p>` : ''}</div>`
    : '';
  return `<section class="page">
    <div class="header">
      <span class="logo">Reve</span>
      <span class="meta">${meta}</span>
    </div>
    <div class="page-body">
      ${ledeHtml}
      ${p.sections.map(renderSection).join('')}
    </div>
    ${closingHtml}
    <div class="footer">
      <span>Reve &nbsp;·&nbsp; AI-native OCIO</span>
      <span>Page ${pageNum} / ${total}</span>
    </div>
  </section>`;
}

function renderMemo({ viewerEmail, memo = DEFAULT_MEMO } = {}) {
  const total = memo.pages.length;
  const meta = memo.meta || 'Investor Memo &nbsp;·&nbsp; Confidential';
  const pagesHtml = memo.pages.map((p, i) => renderPage(p, { pageNum: i + 1, total, meta })).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<title>Reve — Investor Memo</title>
${FONTS}
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>${renderMemoCss()}</style>
</head>
<body>
  <div class="topbar">
    <div class="tb-left">
      <span class="tb-title">Reve · Investor Memo</span>
      <span class="tb-hint">Signed in as ${viewerEmail ? escapeHtml(viewerEmail) : '—'}</span>
    </div>
    <div>
      <a class="tb-btn ghost" href="/investors/logout" style="text-decoration:none;display:inline-block">Sign out</a>
      <a class="tb-btn" href="/investors/download.pdf" style="text-decoration:none;display:inline-block">Download PDF</a>
    </div>
  </div>
  ${pagesHtml}
</body>
</html>`;
}

export { renderGate, renderMemo, escapeHtml };
