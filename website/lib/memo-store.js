// Conversion + persistence helpers for the memo content.
// Storage shape (in the DB as JSONB):
// {
//   meta: 'Investor Memo · Confidential · {date}',
//   pages: [
//     { body: '<html>',  closing: null     },  // page 1
//     { body: '<html>',  closing: '<html>' },  // page 2
//   ]
// }

import { DEFAULT_MEMO } from './memo-content.js';
import { getMemo, setMemo } from './db.js';

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
  return `<h2><span class="num">${s.num}</span> <span>${s.label}</span></h2>${s.body || ''}${renderStats(s.stats)}${renderCallout(s.callout)}${renderPillars(s.pillars)}`;
}

function defaultMemoAsStored() {
  return {
    meta: DEFAULT_MEMO.meta,
    pages: DEFAULT_MEMO.pages.map((p) => {
      const lede = p.lede ? `<p class="lede">${p.lede}</p>` : '';
      const sections = p.sections.map(renderSection).join('');
      const body = `${lede}${sections}`;
      const closing = p.closing
        ? `<p>${p.closing.line}</p>${p.closing.contact ? `<p class="small">${p.closing.contact}</p>` : ''}`
        : null;
      return { body, closing };
    }),
  };
}

async function loadMemoForRender() {
  const row = await getMemo();
  if (row && row.content) return row.content;
  // Empty DB → seed and return
  const seeded = defaultMemoAsStored();
  await setMemo(seeded);
  return seeded;
}

async function saveMemo(content) {
  // Light validation
  if (!content || !Array.isArray(content.pages)) {
    throw new Error('Invalid memo shape');
  }
  for (const p of content.pages) {
    if (typeof p.body !== 'string') throw new Error('Page body must be a string');
    if (p.closing != null && typeof p.closing !== 'string') {
      throw new Error('Page closing must be a string or null');
    }
  }
  if (typeof content.meta !== 'string') {
    throw new Error('Meta must be a string');
  }
  await setMemo(content);
}

export { defaultMemoAsStored, loadMemoForRender, saveMemo };
