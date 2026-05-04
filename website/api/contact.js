import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const TO = 'hello@revecio.com';
const FROM = 'Reve site <noreply@revecio.com>';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const trim = (v, max) => String(v ?? '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};

  if (body.website) return res.status(200).json({ ok: true });

  const name = trim(body.name, 200);
  const firm = trim(body.firm, 200);
  const email = trim(body.email, 200);
  const message = trim(body.message, 5000);

  if (!name || !firm || !email || !message) {
    return res.status(400).json({ error: 'Please fill in all fields.' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Contact form — ${name} (${firm})`,
      text: [
        `Name: ${name}`,
        `Firm: ${firm}`,
        `Email: ${email}`,
        '',
        message,
      ].join('\n'),
    });
    if (result.error) {
      console.error('Resend error:', result.error);
      return res.status(502).json({ error: 'Could not send. Please try again or email us directly.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not send. Please try again or email us directly.' });
  }
}
