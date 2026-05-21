import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

import { ensureSchema, recordVisit, getDocumentBySlug } from '../../lib/db.js';
import { readSession, clientIp } from '../../lib/session.js';
import { sendVisitNotification } from '../../lib/notify.js';
import { renderMemo } from '../../lib/templates.js';

const __filenamePath = fileURLToPath(import.meta.url);
const DECK_PATH = join(dirname(__filenamePath), '..', '..', 'lib', 'deck.html');
const DECK_HTML = readFileSync(DECK_PATH, 'utf8');

export const config = {
  maxDuration: 60,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseSlugFromUrl(url) {
  const u = new URL(url, 'http://x');
  const path = u.pathname.replace(/\/+$/, '');
  // /investors/<slug>/download.pdf
  const m = path.match(/^\/(?:api\/)?investors\/([^/]+)\/download(?:\.pdf)?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req, res) {
  // Auth gate — must have a valid investor session cookie
  const session = readSession(req);
  if (!session?.email) {
    res.statusCode = 302;
    res.setHeader('Location', '/investors');
    return res.end();
  }

  const slug = parseSlugFromUrl(req.url);
  if (!slug) {
    res.statusCode = 302;
    res.setHeader('Location', '/investors');
    return res.end();
  }

  const email = session.email;
  const ip = clientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  if (slug === 'deck') {
    return handleDeckDownload({ res, email, ip, userAgent });
  }

  let browser = null;
  try {
    let doc;
    try {
      await ensureSchema();
      doc = await getDocumentBySlug(slug);
    } catch (err) {
      console.error('[download] document load failed:', err?.message);
    }
    if (!doc || !doc.visible) {
      res.statusCode = 302;
      res.setHeader('Location', '/investors');
      return res.end();
    }

    try {
      await recordVisit({
        email, ip, userAgent, action: 'download',
        documentSlug: doc.slug, documentTitle: doc.title,
      });
    } catch (err) {
      console.error('[download] visit log failed:', err);
    }

    const html = renderMemo({
      viewerEmail: email,
      memo: doc.content,
      documentTitle: doc.title,
      documentSlug: doc.slug,
      hideTopbar: true,
      watermark: { email, date: todayIso() },
    });

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'letter',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    try {
      await sendVisitNotification({
        email, ip, userAgent, action: 'download',
        documentSlug: doc.slug, documentTitle: doc.title,
      });
    } catch (err) {
      console.error('[download] notification failed:', err?.message);
    }

    const filename = `reve-${doc.slug}-${todayIso()}.pdf`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.end(pdf);
  } catch (err) {
    console.error('[download] PDF generation failed:', err?.message, err?.stack);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Could not generate the PDF. Please try again in a moment.');
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function handleDeckDownload({ res, email, ip, userAgent }) {
  let browser = null;
  try {
    try {
      await recordVisit({
        email, ip, userAgent, action: 'download',
        documentSlug: 'deck', documentTitle: 'Reve Investor Deck',
      });
    } catch (err) {
      console.error('[deck download] visit log failed:', err?.message);
    }

    const date = todayIso();
    const watermark = `${email} · ${date} · Confidential`;
    const safeWatermark = watermark.replace(/"/g, '\\"');
    const watermarkStyle = `<style>
      .slide::after {
        content: "${safeWatermark}";
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(20,23,28,0.4);
        z-index: 50;
        pointer-events: none;
        white-space: nowrap;
      }
      .slide.dark::after { color: rgba(244,241,234,0.45); }
    </style>`;
    const html = DECK_HTML.replace('</head>', watermarkStyle + '</head>');

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });
    const pdf = await page.pdf({
      width: '1920px',
      height: '1080px',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    try {
      await sendVisitNotification({
        email, ip, userAgent, action: 'download',
        documentSlug: 'deck', documentTitle: 'Reve Investor Deck',
      });
    } catch (err) {
      console.error('[deck download] notification failed:', err?.message);
    }

    const filename = `reve-deck-${date}.pdf`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.end(pdf);
  } catch (err) {
    console.error('[deck download] PDF generation failed:', err?.message, err?.stack);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Could not generate the PDF. Please try again in a moment.');
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
