import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

import { ensureSchema, recordVisit } from '../../lib/db.js';
import { readSession, clientIp } from '../../lib/session.js';
import { sendVisitNotification } from '../../lib/notify.js';
import { renderMemo } from '../../lib/templates.js';

export const config = {
  maxDuration: 60,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  // Auth gate — must have a valid investor session cookie
  const session = readSession(req);
  if (!session?.email) {
    res.statusCode = 302;
    res.setHeader('Location', '/investors');
    return res.end();
  }

  const email = session.email;
  const ip = clientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  let browser = null;
  try {
    // Log the download (don't block PDF on logging errors)
    try {
      await ensureSchema();
      await recordVisit({ email, ip, userAgent, action: 'download' });
    } catch (err) {
      console.error('[download] visit log failed:', err);
    }

    // Build the watermarked HTML — same memo, plus diagonal watermark layer
    const html = renderMemo({
      viewerEmail: email,
      hideTopbar: true,
      watermark: { email, date: todayIso() },
    });

    // Launch headless Chromium (binary + shared libs bundled by @sparticuz/chromium)
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

    // Send notification email after PDF generated (await — must finish before response)
    try {
      await sendVisitNotification({ email, ip, userAgent, action: 'download' });
    } catch (err) {
      console.error('[download] notification failed:', err?.message);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reve-investor-memo-${todayIso()}.pdf"`
    );
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return res.end(pdf);
  } catch (err) {
    console.error('[download] PDF generation failed:', err?.message, err?.stack);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Could not generate the PDF. Please try again in a moment.');
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
