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
  "intent": "analyze" | "answer_content" | "org_info" | "optimize" | "open" | "next" | "previous" | "switch" | "edit" | "switch_and_edit" | "question" | "unclear",
  "targetModule": "ips" | "portfolio" | "materials" | "monitoring" | "board" | "decisions" | "profile" | null,
  "targetSectionNum": <number or null>,
  "query": "sharpe" | "return" | "vol" | "real_return" | "allocation" | "liquidity" | "metrics" | null,
  "editPrompt": <string or null>,
  "answer": <string or null>,
  "reply": <string or null>
}

Rules:
- "analyze" — ANY factual question about a portfolio metric. ALWAYS use analyze for these — do NOT use "unclear", "question", or "open" for a specific metric question. Examples and the query value to use:
  - "what's the Sharpe?" / "Sharpe ratio?" / "what's the sharpe ratio in the asset allocation?" → query="sharpe"
  - "expected return?" / "10y return?" / "what return are we looking at?" → query="return"
  - "what's the vol?" / "annualized risk?" / "how risky is it?" → query="vol"
  - "real return?" / "after inflation?" / "real growth?" → query="real_return"
  - "what's the asset mix?" / "show the weights" / "current allocation?" / "what are we holding?" → query="allocation"
  - "liquidity coverage?" / "spending cushion?" / "can we cover capital calls?" / "how much liquidity?" → query="liquidity"
  - "summarize the portfolio" / "give me the key metrics" / "headline numbers" → query="metrics"
  If a question mentions a metric word (Sharpe, vol, allocation, weights, return, real return, liquidity, coverage, cushion), it is almost always analyze.
- "answer_content" — a factual question about what the IPS DOCUMENT TEXT says: its provisions, rules, requirements, definitions, or whether the IPS addresses a given topic. This is about the written policy, NOT a portfolio number. Set "targetSectionNum" to the single most relevant IPS section (use the section list to pick it), and set "reply" to a one-sentence direct lead-in answer. Examples:
  - "are there any ESG requirements in the IPS?" / "does the IPS cover mission-aligned investing?" / "what's our SRI policy?" → answer_content, targetSectionNum = the "Mission-Aligned Investing and ESG" section
  - "what does the IPS say about rebalancing?" / "when do we rebalance?" / "what are the rebalancing triggers?" → answer_content, targetSectionNum = the "Rebalancing Policy" section
  - "what's prohibited?" / "can we hold crypto?" / "are there any investment restrictions?" → answer_content, targetSectionNum = the "Permitted and Prohibited Investments" section
  - "how is risk defined?" / "what's our risk tolerance?" / "what does the IPS say about stress testing?" → answer_content, targetSectionNum = the "Risk Tolerance and Risk Management" section
  - "who approves the SAA?" / "what's the OCIO's role?" → answer_content, targetSectionNum = the "Roles and Responsibilities" section
  - "what's our spending policy?" / "what's the payout rule?" → answer_content, targetSectionNum = the "Spending Policy" section
  Use answer_content (NOT analyze) whenever the user asks what the policy says or whether the IPS contains a provision, rather than asking for a computed portfolio figure. Use answer_content (NOT open) when the user wants the answer, not to start editing.
- "org_info" — a question about the CLIENT ORGANIZATION ITSELF or facts found in the uploaded client materials/profile: mission and purpose, history, AUM / endowment size, financials (income, expenses, net assets, operating budget), the stated spending policy, programs, leadership and staff, donors, campaigns, or anything described in the materials. ANSWER it directly: put a concise, 1–4 sentence answer in "answer", grounded STRICTLY in the "Client materials on file" provided below. You may use minimal HTML (<p>, <strong>). If the materials genuinely do not contain the answer, set "answer" to a brief note saying you don't see it in the materials on file. Examples:
  - "what's the mission of the org?" / "what does this organization do?" → org_info
  - "what's its AUM?" / "how big is the endowment?" / "what are total net assets?" → org_info
  - "what were revenues and expenses last year?" / "what's the operating budget?" → org_info
  - "who's the music director / CEO / board chair?" → org_info
  - "what's their spending policy?" → org_info (the policy as STATED in the materials; if they instead ask what the drafted IPS says, that's answer_content)
  Use org_info (NOT analyze) for facts about the institution; analyze is only for computed portfolio metrics on the modeled allocation. Use org_info (NOT answer_content) when the question is about the client/materials rather than the IPS document this tool drafted.
- "optimize" — user asks for the MEAN-VARIANCE OPTIMIZED / MAX-SHARPE / OPTIMAL allocation. Run optimization inline. Set "query" if a specific metric is asked, otherwise leave null and we'll show the full metrics. Examples:
  - "run MVO" / "what does MVO give us?" / "what's the optimal allocation?" → optimize, query=null
  - "what's the MVO Sharpe?" / "what would the Sharpe be optimized?" / "what would the sharpe be based on mean variance optimization" → optimize, query="sharpe"
  - "what does the optimizer recommend?" / "show me the max-Sharpe portfolio" → optimize, query="allocation"
  - "what if we ran mean-variance optimization on this?" → optimize, query=null
- "open" — user wants to pull up a vault item to WORK in it, not just ask a factual question. Set targetModule:
  - "open the IPS" → ips
  - "let's model the portfolio" / "open the asset allocation" → portfolio
  - "show me the materials" → materials
  - "open monitoring" / "show me what's happening in the portfolio" / "any new updates?" / "what are the managers saying?" / "show me drift" / "what's our actual exposure" → monitoring
  - "show me the board notes" / "what did the IC decide last quarter" → board
  - "open the decision log" / "what decisions have we made" → decisions
  - "open the profile" / "show me the client info" → profile
- "next" / "previous" — only when IPS is in focus and the user wants to advance/retreat through sections.
- "switch" — focus on a different IPS section without editing.
- "edit" — change the CURRENT IPS section. editPrompt = neutral instruction.
- "switch_and_edit" — change a DIFFERENT IPS section. Set targetSectionNum and editPrompt.
- "question" — a question that is neither an analyze metric nor an answer_content policy question, and doesn't change focus. Set reply.
- "unclear" — you can't tell. Set reply to a follow-up question.

Important:
- Prefer "analyze" over "open" when the user is asking a specific numeric question. "What's the Sharpe?" is analyze. "Open the SAA" is open.
- "analyze" is for COMPUTED PORTFOLIO NUMBERS; "answer_content" is for WHAT THE IPS TEXT SAYS; "org_info" is for FACTS ABOUT THE CLIENT/MATERIALS. "What's the liquidity coverage?" is analyze (a number); "What does the IPS say about liquidity?" is answer_content; "What's the org's mission / AUM?" is org_info.
- For org_info, never invent facts. Use only the materials/profile provided; if absent, say you don't see it.
- editPrompt should NOT echo verbatim; restate clearly.
- "ok"/"yes" alone is ambiguous — return "unclear".
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
  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const materials = Array.isArray(body.materials) ? body.materials.slice(0, 8) : [];

  if (!userMessage || !sections.length) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing fields.' }));
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'AI not configured (missing ANTHROPIC_API_KEY).' }));
  }

  const sectionList = sections.map((s) => `  ${s.num}. ${String(s.title).slice(0, 80)}`).join('\n');
  const historyBlock = history.length
    ? `\nConversation so far (oldest first; agent answers are summarized):\n${history.map((h) => `  ${h.role === 'user' ? 'USER' : 'AGENT'}: ${String(h.text || '').slice(0, 350)}`).join('\n')}\n`
    : '';
  const materialsBlock = materials.length
    ? `\nClient materials on file (excerpts — the ONLY source for org_info answers; do not invent beyond these):\n${materials.map((m) => `[${String(m.source || 'document').slice(0, 80)}] ${String(m.text || '').slice(0, 1800)}`).join('\n\n')}\n`
    : '';
  const userBlock = `Current module: ${currentModule}
Current IPS section in focus: ${currentSectionNum}. ${currentSectionTitle}

All IPS sections:
${sectionList}
${materialsBlock}${historyBlock}
Latest user message: ${userMessage}

Use the conversation so far to resolve references like "it", "that", "what about", "what if". For example, if the user asked about Sharpe and then says "what would it be with MVO", the intent is "optimize" with query="sharpe".

Return only the JSON object.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
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
