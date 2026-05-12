import { Resend } from 'resend';

const FROM = 'Reve <noreply@revecio.com>';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

async function sendVisitNotification({ email, ip, userAgent, action }) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) {
    console.warn('RESEND_API_KEY or ADMIN_EMAIL not set; skipping visit email');
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const when = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const actionLabel = action === 'download' ? 'downloaded the memo PDF' : 'viewed the memo';

  const text = [
    `Reve memo: ${actionLabel}`,
    '',
    `Viewer:      ${email}`,
    `Action:      ${action}`,
    `When:        ${when} ET`,
    `IP:          ${ip || 'unknown'}`,
    `User agent:  ${userAgent || 'unknown'}`,
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,sans-serif;background:#f7f5f0;color:#14171c;padding:24px;margin:0">
    <table cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d9d4c7;border-radius:10px;overflow:hidden">
      <tr><td style="padding:24px 28px 12px 28px;border-bottom:1px solid #d9d4c7">
        <div style="font-family:'Newsreader',Georgia,serif;font-size:22px;letter-spacing:0.005em">Reve</div>
        <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6a6f78;margin-top:4px">Investor memo · activity</div>
      </td></tr>
      <tr><td style="padding:20px 28px">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5">Someone just ${actionLabel} at <strong>revecio.com/investors</strong>.</p>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;width:100%">
          <tr><td style="padding:6px 0;color:#6a6f78;width:120px">Viewer</td><td style="padding:6px 0"><strong>${escapeHtml(email)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6a6f78">When</td><td style="padding:6px 0">${escapeHtml(when)} ET</td></tr>
          <tr><td style="padding:6px 0;color:#6a6f78">IP</td><td style="padding:6px 0;font-family:'JetBrains Mono',monospace;font-size:12px">${escapeHtml(ip || 'unknown')}</td></tr>
          <tr><td style="padding:6px 0;color:#6a6f78;vertical-align:top">Agent</td><td style="padding:6px 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#2b3038">${escapeHtml(userAgent || 'unknown')}</td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  try {
    await resend.emails.send({
      from: FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `Reve memo ${action === 'download' ? 'downloaded' : 'viewed'}: ${email}`,
      text,
      html,
    });
  } catch (err) {
    console.error('sendVisitNotification failed:', err);
  }
}

export { sendVisitNotification };
