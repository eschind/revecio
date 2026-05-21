import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

import { ensureSchema, recordVisit, getDocumentBySlug, isDeckVisible } from '../../lib/db.js';
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
    try { await ensureSchema(); } catch {}
    const visible = await isDeckVisible().catch(() => true);
    if (!visible) {
      res.statusCode = 302;
      res.setHeader('Location', '/investors');
      return res.end();
    }
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
    const watermarkText = `${email}  ·  ${date}`;
    const safe = watermarkText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const lightSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420'>
      <text x='320' y='210' font-family='Helvetica, Arial, sans-serif' font-size='20' font-weight='400'
            fill='rgba(20,23,28,0.14)' transform='rotate(-28 320 210)' text-anchor='middle'>${safe}</text>
    </svg>`;
    const darkSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420'>
      <text x='320' y='210' font-family='Helvetica, Arial, sans-serif' font-size='20' font-weight='400'
            fill='rgba(244,241,234,0.18)' transform='rotate(-28 320 210)' text-anchor='middle'>${safe}</text>
    </svg>`;
    const lightUrl = `data:image/svg+xml;utf8,${encodeURIComponent(lightSvg)}`;
    const darkUrl = `data:image/svg+xml;utf8,${encodeURIComponent(darkSvg)}`;
    const watermarkStyle = `<style>
      .slide { position: relative; }
      .slide::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 200;
        background-image: url("${lightUrl}");
        background-repeat: repeat;
        background-position: 0 0;
      }
      .slide.dark::before {
        background-image: url("${darkUrl}");
      }
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
