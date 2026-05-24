import Anthropic from '@anthropic-ai/sdk';
import { readSession } from '../../lib/session.js';

const SYSTEM_PROMPT = `You route chat messages from a user who is reviewing an Investment Policy Statement (IPS) draft inside an OCIO product called Reve. The IPS has numbered sections. The user can move between sections or ask for edits.

You will receive:
- The current section the user is focused on
- The list of all sections (number and title)
- The user's chat message

Classify the message into one of these intents and return ONLY a single JSON object (no markdown, no commentary):

{
  "intent": "next" | "previous" | "switch" | "edit" | "switch_and_edit" | "question" | "unclear",
  "targetSectionNum": <number or null>,
  "editPrompt": <string or null>,
  "reply": <string or null>
}

Rules:
- "next" — wants to advance to the next section. Examples: "next", "move on", "continue", "let's keep going", "ok next".
- "previous" — wants to go back. Examples: "back", "previous section", "let's go back".
- "switch" — wants to focus on a different section but isn't asking to edit it. Examples: "show me section 4", "go to section 7", "switch to spending policy".
- "edit" — wants to change the CURRENT section. Set targetSectionNum to the current section's number. editPrompt should be a concise plain-English instruction restating what to change.
- "switch_and_edit" — wants to change a DIFFERENT section. Set targetSectionNum to that section's number (resolve by number if given, or by matching section titles if the user references one by name). editPrompt = the change.
- "question" — the user is asking a clarifying question about the IPS or what's in a section, not requesting a change. Set reply to a brief, helpful response.
- "unclear" — you can't tell what they want. Set reply to a brief follow-up question.

Important:
- Be liberal with intent detection. "let's move on" or "ok continue" should be "next", not "edit".
- editPrompt should NOT echo the user's exact words verbatim. Restate what they want done in clear, neutral language.
- If a user references "section X" by number, set targetSectionNum to X.
- If a user references a section by title (or partial title), match against the section list and use that number.
- "ok" or "yes" alone is ambiguous — return "unclear" and ask whether to move on.
- Never include markdown code fences in your output. Return raw JSON only.`;

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
  const userBlock = `Current section: ${currentSectionNum}. ${currentSectionTitle}

All sections:
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
