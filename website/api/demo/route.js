import Anthropic from '@anthropic-ai/sdk';
import { readSession } from '../../lib/session.js';

const SYSTEM_PROMPT = `You are the routing layer for an OCIO product called Reve. The user is working in a client workspace that contains an Investment Policy Statement (IPS), a Strategic Asset Allocation (SAA) module, and uploaded Materials. The IPS has numbered sections.

You receive:
- The currently open module ("ips", "portfolio", or "materials")
- The current IPS section the user is focused on (if applicable)
- The list of all IPS sections (number and title)
- The user's chat message

Classify the message and return ONLY a single JSON object (no markdown, no commentary):

{
  "intent": "open" | "next" | "previous" | "switch" | "edit" | "switch_and_edit" | "question" | "unclear",
  "targetModule": "ips" | "portfolio" | "materials" | null,
  "targetSectionNum": <number or null>,
  "editPrompt": <string or null>,
  "reply": <string or null>
}

Rules:
- "open" — user wants to pull up a different vault item. Set targetModule to "ips", "portfolio", or "materials". Examples: "show me the portfolio", "pull up the SAA", "open the IPS", "let's look at the materials", "model the allocation".
- "next" / "previous" — only when an IPS draft is the current focus and the user wants to advance/retreat through sections. Examples: "next", "move on", "back".
- "switch" — focus on a different IPS section without editing. Examples: "show me section 4", "go to spending policy".
- "edit" — change the CURRENT IPS section. editPrompt = concise plain-English instruction restating what to change.
- "switch_and_edit" — change a DIFFERENT IPS section. Set targetSectionNum and editPrompt.
- "question" — clarifying question that doesn't change focus. Set reply to a brief, helpful answer.
- "unclear" — you can't tell. Set reply to a brief follow-up question.

Important:
- If the user references the portfolio, SAA, allocation, weights, capital market assumptions, or modeling, that's "open" with targetModule="portfolio".
- If they reference the IPS or a section by number/title from the IPS module while not currently in IPS, that's "open" with targetModule="ips" (plus optionally targetSectionNum).
- editPrompt should NOT echo the user's exact words verbatim. Restate clearly and neutrally.
- "ok" or "yes" alone is ambiguous — return "unclear" and ask what they want next.
- Never include markdown code fences. Return raw JSON only.`;

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

function tryParseJson(s) {
  let cleaned = s.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  try { return JSON.parse(cleaned); } catch { return null; }
}

export const config = { maxDuration: 15 };

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

  const userMessage = String(body.userMessage || '').slice(0, 2000);
  const currentSectionNum = Number(body.currentSectionNum) || 0;
  const currentSectionTitle = String(body.currentSectionTitle || '').slice(0, 200);
  const currentModule = String(body.currentModule || 'ips').slice(0, 32);
  const sections = Array.isArray(body.sections) ? body.sections.slice(0, 30) : [];

  if (!userMessage || !sections.length) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing fields.' }));
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'AI not configured (missing ANTHROPIC_API_KEY).' }));
  }

  const sectionList = sections.map((s) => `  ${s.num}. ${String(s.title).slice(0, 80)}`).join('\n');
  const userBlock = `Current module: ${currentModule}
Current section: ${currentSectionNum}. ${currentSectionTitle}

All IPS sections:
${sectionList}

User message: ${userMessage}

Return only the JSON object.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userBlock }],
    });
    let text = '';
    for (const block of response.content) if (block.type === 'text') text += block.text;
    const parsed = tryParseJson(text);
    if (!parsed) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'Could not parse AI response.', raw: text }));
    }
    res.statusCode = 200;
    return res.end(JSON.stringify(parsed));
  } catch (err) {
    console.error('[demo/route] error:', err?.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Routing failed. Please try again.' }));
  }
}
