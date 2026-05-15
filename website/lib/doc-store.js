// Document content store: loads/saves the document content (the same JSON shape
// the memo editor produces — { meta, pages: [{ body, closing }] }).

import { DEFAULT_MEMO } from './memo-content.js';
import {
  getDocumentBySlug,
  updateDocument,
  createDocument,
  listDocuments,
} from './db.js';

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

function emptyDocContent({ title }) {
  return {
    meta: `${title} &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; {date}`,
    pages: [
      { body: `<p class="lede">Replace this with your opening paragraph.</p><h2><span class="num">01</span> <span>Section one</span></h2><p>Body content.</p>`, closing: null },
    ],
  };
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function uniqueSlug(base) {
  let slug = slugify(base) || 'document';
  let i = 1;
  // Walk until we find a slug not in use
  // (limited to a few attempts; in practice this rarely loops)
  while (await getDocumentBySlug(slug)) {
    i += 1;
    slug = `${slugify(base)}-${i}`;
  }
  return slug;
}

async function loadDocumentForRender(slug) {
  const row = await getDocumentBySlug(slug);
  return row || null;
}

async function ensureAtLeastOneDocument() {
  const docs = await listDocuments();
  if (docs.length === 0) {
    const seed = defaultMemoAsStored();
    await createDocument({ slug: 'memo', title: 'Investor Memo', content: seed });
  }
}

async function saveDocumentContent(slug, content) {
  if (!content || !Array.isArray(content.pages)) {
    throw new Error('Invalid document shape');
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
  await updateDocument(slug, { content });
}

async function createNewDocument({ title }) {
  const baseSlug = title || 'new-document';
  const slug = await uniqueSlug(baseSlug);
  const t = (title || 'New document').trim();
  const content = emptyDocContent({ title: t });
  await createDocument({ slug, title: t, content });
  return { slug, title: t };
}

export {
  defaultMemoAsStored,
  emptyDocContent,
  slugify,
  uniqueSlug,
  loadDocumentForRender,
  ensureAtLeastOneDocument,
  saveDocumentContent,
  createNewDocument,
};
