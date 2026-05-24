import Anthropic from '@anthropic-ai/sdk';
import { readSession } from '../../lib/session.js';

const SYSTEM_PROMPT = `You are an expert in institutional investing helping draft an Investment Policy Statement (IPS) for a non-profit foundation, endowment, or arts/cultural organization.

You will be given:
- The section title
- The current HTML content of the section (the inner HTML inside a section-content div)
- A user's edit request

Apply the edit and return ONLY the updated HTML content (no wrapper div, no <section>, no <h3> heading — that exists outside what you return). Preserve the document's professional tone and the existing structural style (paragraphs, definition lists, lists, etc.). Make all changes within the section needed to address the request consistently — for example, if the user asks to switch the OCIO from discretionary to non-discretionary, update every relevant phrase in the section, not just one mention.

Output rules:
- Return only HTML — no commentary, no markdown, no explanations
- Do not include the section heading
- Do not invent specific numbers (percentages, dollar amounts, dates) unless the user provided them
- Keep paragraphs short and IPS-appropriate
- If the request is unclear or impossible to apply within this section, return the original HTML unchanged`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const session = readSession(req);
  if (!session) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Sign in to use the demo.' }));
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed.' }));
  }

  let body;
  try { body = await readBody(req); } catch {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Invalid JSON.' }));
  }

  const sectionTitle = String(body.sectionTitle || '').slice(0, 200);
  const sectionHtml = String(body.sectionHtml || '');
  const userPrompt = String(body.userPrompt || '').slice(0, 2000);

  if (!sectionTitle || !sectionHtml || !userPrompt) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing fields.' }));
  }
  if (sectionHtml.length > 30000) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Section too long.' }));
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'AI not configured (missing ANTHROPIC_API_KEY).' }));
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Section title: ${sectionTitle}

Current HTML content:
${sectionHtml}

User edit request: ${userPrompt}

Return only the updated HTML content.`,
      }],
    });

    let newHtml = '';
    for (const block of response.content) {
      if (block.type === 'text') newHtml += block.text;
    }
    newHtml = newHtml.trim();

    // Strip any accidental code fences
    newHtml = newHtml.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    if (!newHtml) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'Empty response from AI.' }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ html: newHtml }));
  } catch (err) {
    console.error('[demo/edit-section] error:', err?.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'AI edit failed. Please try again.' }));
  }
}
