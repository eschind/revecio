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
  "intent": "analyze" | "answer_content" | "org_info" | "spend_model" | "set_benchmark" | "edit_facts" | "optimize" | "open" | "next" | "previous" | "switch" | "edit" | "switch_and_edit" | "question" | "unclear",
  "targetModule": "ips" | "portfolio" | "benchmarks" | "spending" | "materials" | "monitoring" | "board" | "decisions" | "profile" | null,
  "targetSectionNum": <number or null>,
  "query": "sharpe" | "return" | "vol" | "real_return" | "allocation" | "liquidity" | "metrics" | "capital_calls" | "capital_calls_all" | "factor_exposure" | "style_exposure" | "currency_exposure" | "risk_exposure" | null,
  "scenario": "base" | "downturn" | "upside" | null,
  "adjustments": [ { "key": <string>, "factor": <number> } ] | null,
  "assetClass": "us_eq" | "intl_eq" | "em_eq" | "core_fi" | "tips" | "hy" | "hf" | "pe" | "pc" | "ra" | "cash" | null,
  "benchmark": <string or null>,
  "factKey": "mission" | "spending" | "cashNeeds" | "drawdown" | "constraints" | "governance" | null,
  "newValue": <string or null>,
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
  - "outstanding capital calls" / "any capital calls due" / "what capital calls do we have" / "upcoming capital calls" → query="capital_calls" (returns only pending)
  - "show me all the capital calls" / "capital call history" → query="capital_calls_all"
  - "factor exposure" / "macro factor sensitivities" / "what's our rate sensitivity?" / "what factors are we exposed to?" / "show me the factor exposure for the current asset allocation" / "what's the factor exposure for it?" / "growth / rates / inflation exposure" → query="factor_exposure"
  - "style tilts" / "value tilt" / "size factor" / "are we tilted toward quality?" / "style exposure" → query="style_exposure"
  - "currency exposure" / "FX exposure" / "USD exposure" / "what's our foreign-currency weight?" / "are we long the dollar?" → query="currency_exposure"
  - "risk exposures" / "show me the risk profile" / "what are the portfolio's risk exposures?" / "open risk" — when the user wants a SUMMARY across all three (factor, style, currency) → query="risk_exposure"
  Critical: "factor exposure" is NOT the same as "allocation". Allocation is the asset-class weights. Factor exposure is the SAA-weighted macro-factor sensitivity (growth, rates, inflation, credit, commodity, USD, vol). If the question mentions "factor", "tilt", "currency", "FX", "rate sensitivity", "USD strength", "risk exposure", "style", do NOT pick query="allocation".
  If a question mentions a metric word (Sharpe, vol, allocation, weights, return, real return, liquidity, coverage, cushion), it is almost always analyze.
  If a question is about capital calls — outstanding, upcoming, due, history — it is ALWAYS analyze with a capital_calls query, NEVER open with targetModule=monitoring.
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
  - "open the spending model" / "spending & liquidity" / "the budget model" → spending
  - "open the benchmarks" / "show me the policy benchmark" / "what are we benchmarked against" / "set the benchmarks" → benchmarks
- "spend_model" — user wants to change an assumption or scenario in the spending/liquidity model and see the impact (typically while currentModule is "spending"). Return:
  - "scenario": one of base/downturn/upside if the user names a scenario (e.g. "model the downturn", "show the upside case"), else null.
  - "adjustments": an array of { "key", "factor" } where factor is a MULTIPLIER (0.8 = down 20%, 1.1 = up 10%, 1.0 = unchanged). Map the user's words to these line-item keys:
      INCOME: tuition (net tuition & fees), grants (government & research grants), gifts (gifts/donations/annual giving), auxiliary (housing/dining/auxiliary), otherIncome.
      EXPENSE: comp (compensation/salaries/benefits), aid (financial aid), facilities (facilities & operations), research (research & academic programs), debt (debt service), otherExpense (administration & other).
    Examples: "donations drop 20% and tuition falls 5%" → adjustments=[{"key":"gifts","factor":0.8},{"key":"tuition","factor":0.95}]; "increase financial aid by 10%" → [{"key":"aid","factor":1.1}]; "what if research spending doubles" → [{"key":"research","factor":2}].
  - Set "reply" to a one-to-two-sentence narration of the change and its effect on the margin of safety. If the user only names a scenario with no line change, set adjustments=null.
- "set_benchmark" — user wants to CHANGE the performance benchmark / index for a specific asset class (typically while currentModule is "benchmarks", but not required). Return:
  - "assetClass": the asset-class id the benchmark applies to — one of us_eq (U.S. equity), intl_eq (international developed equity), em_eq (emerging markets equity), core_fi (core fixed income / bonds), tips, hy (high yield), hf (hedge funds), pe (private equity), pc (private credit), ra (real assets), cash.
  - "benchmark": the index/benchmark name the user wants, as a clean string (e.g. "Russell 1000", "MSCI ACWI ex-US", "Morningstar LSTA Leveraged Loan + 1.5%").
  - "reply": a one-sentence confirmation.
  Examples: "use Russell 1000 for U.S. equity" → assetClass="us_eq", benchmark="Russell 1000"; "benchmark private credit against the Cliffwater direct lending index" → assetClass="pc", benchmark="Cliffwater Direct Lending Index"; "change the bond benchmark to the Bloomberg US Universal" → assetClass="core_fi", benchmark="Bloomberg U.S. Universal"; "set the real assets benchmark to CPI + 4%" → assetClass="ra", benchmark="CPI + 4%". If the user asks to change a benchmark but you can't tell which asset class, set assetClass=null and put a clarifying question in reply.
- "edit_facts" — STRONG OVERRIDE: any request to CHANGE / MODIFY / UPDATE / EDIT / REMOVE / ADD / ADJUST a CLIENT PROFILE fact (mission, spending policy, cash needs, drawdown tolerance, constraints, governance) ALWAYS uses edit_facts. NEVER use "edit", "switch_and_edit", "org_info", "unclear", or "question" for these — even when the user is in the IPS module, even when they only say the word "mission" (or any other fact name) plus a change verb. The word "profile" need not appear. Set:
  - "factKey" = one of mission | spending | cashNeeds | drawdown | constraints | governance, matched to the user's wording.
  - "newValue" = the REWRITTEN fact text in plain English (1–3 sentences). Read the current fact value (provided below under "Client profile facts") and incorporate the user's change. Do not echo the user's instruction verbatim; produce a clean replacement.
  - "reply" = a one-sentence narration of what changed.
  Mapping examples (note: factKey and a non-empty newValue are REQUIRED whenever intent=edit_facts):
  - "change the mission to focus on undergraduate education" → factKey="mission", newValue=rewritten mission
  - "let's change the mission to remove the catholic/jesuit part" → factKey="mission", newValue=current mission rewritten without the catholic/jesuit framing
  - "under Mission in Profile, let's remove the catholic/jesuit part" → factKey="mission" (same as above)
  - "update the spending policy to 5% of trailing 12-quarter average" → factKey="spending"
  - "tighten the drawdown tolerance to 15%" → factKey="drawdown"
  - "add an exclusion for private prisons" → factKey="constraints"
  - "the IC has nine members now, not seven" → factKey="governance"
  - "make the mission shorter" → factKey="mission", newValue=condensed mission
  - "remove the line about Catholic Social Teaching from the constraints" → factKey="constraints", newValue=constraints minus the named line
  After this intent fires the app updates the profile fact and offers a one-click cascade into the IPS. Anti-pattern: do NOT classify "change the mission" as "edit" (that's for IPS sections), as "org_info" (that's read-only), or as "unclear" (the request is clear — just produce the rewrite).
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
  const facts = (body.facts && typeof body.facts === 'object') ? body.facts : null;
  const isMarket = currentModule === 'research-market';
  const isResearch = currentModule.startsWith('research') && !isMarket;
  const isTasks = currentModule === 'tasks';
  // Cap large enough to fit the full manager universe (currently ~150) with headroom.
  const managers = isResearch && Array.isArray(body.managers) ? body.managers.slice(0, 250) : null;
  const tasks = isTasks && Array.isArray(body.tasks) ? body.tasks.slice(0, 60) : null;
  const market = isMarket && body.market && typeof body.market === 'object' ? body.market : null;

  if (!userMessage) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing fields.' }));
  }
  if (!isResearch && !isTasks && !isMarket && !sections.length) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing fields.' }));
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'AI not configured (missing ANTHROPIC_API_KEY).' }));
  }

  // Research mode — dedicated free-form prompt, no intent classification.
  if (isResearch) {
    const mgrBlock = (managers || []).map((m) => {
      const tr = m.tr || {};
      const pct = (n) => n == null ? '—' : `${(n * 100).toFixed(1)}%`;
      const aum = (n) => n == null ? '—' : (n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : `$${(n/1e6).toFixed(0)}M`);
      let perf;
      if (Array.isArray(m.vintages) && m.vintages.length) {
        const total = m.vintages.reduce((s, v) => s + v.sizeM, 0);
        const uw = m.vintages.reduce((s, v) => s + v.quartile, 0) / m.vintages.length;
        const w = m.vintages.reduce((s, v) => s + v.quartile * v.sizeM, 0) / total;
        const vStr = m.vintages.map((v) => `${v.name} (${v.year}, $${v.sizeM}M, Q${v.quartile})`).join('; ');
        perf = `vintages: ${vStr}; avg quartile unweighted ${uw.toFixed(2)}, size-weighted ${w.toFixed(2)} (1=top, 4=bottom) vs ${m.benchmark}`;
      } else {
        perf = `1Y ${pct(tr.oneY)} vs ${pct(tr.benchOneY)}, 3Y ${pct(tr.threeY)} vs ${pct(tr.benchThreeY)}, 5Y ${pct(tr.fiveY)} vs ${pct(tr.benchFiveY)}, ITD ${pct(tr.itd)} vs ${pct(tr.benchItd)} (vs ${m.benchmark})`;
      }
      return `- ${m.name} (${m.id}) · ${m.assetClass} · ${m.sleeve} · ${m.vehicle} · HQ ${m.hq} · firm ${aum(m.firmAum)}, strategy ${aum(m.strategyAum)} · inception ${m.inception} · fee ${m.fee} · min ${aum(m.minimum)} · liq ${m.liquidity} · ${perf}\n   ${m.description}`;
    }).join('\n');
    const sys = `You are the manager-research agent inside an OCIO product called Reve. You help the user navigate a tracked universe of investment managers. Answer concisely and directly using only the manager facts provided — do not invent funds, AUM, or returns. If the user asks something the data doesn't support, say so plainly.

Style: short paragraphs, no markdown headers, no bullet-point spam, NO ASCII tables with pipes. Reference managers by name. Returns are net of fees, annualized for 3Y/5Y/ITD. Use US dollars.

When the user asks for a table, list, or comparison of multiple managers, return a structured exhibit instead of formatting one in plain text — the client will render it as a real table.

Return ONLY a single JSON object with this schema (no markdown fences):
{
  "reply": "<short plain-text intro / context, 1-3 sentences>",
  "exhibit": null | {
    "type": "table",
    "title": "<short heading>",
    "columns": ["<col 1>", "<col 2>", ...],
    "rows": [["<cell>", "<cell>", ...], ...],
    "managerIds": ["<id matching column 1, optional, same length as rows>"]
  } | {
    "type": "manager_list",
    "title": "<short heading>",
    "managerIds": ["<id1>", "<id2>", ...]
  }
}

Rules for exhibits:
- Use "table" for any multi-column / multi-row data: lists of managers with stats, side-by-side metrics, etc. The first column should usually be the manager name. If column 1 is manager names, also fill "managerIds" with their ids so the client can make them clickable.
- Use "manager_list" only when listing managers with no per-row stats (the client will render them as clickable cards).
- Set "exhibit": null when the answer is a 1-3 sentence narrative reply, a fact about a single manager, or a meta question. Don't force an exhibit.
- Keep cell values short (single number, label, or short phrase). Format AUM as "$X.XB" or "$XM". Format percentages as "X.X%". Quartiles as "Q1"-"Q4".
- The "reply" field is the narrative; the exhibit is the visual. Don't duplicate the table contents in the reply.`;
    const historyBlock = history.length
      ? `\nConversation so far (oldest first):\n${history.map((h) => `  ${h.role === 'user' ? 'USER' : 'AGENT'}: ${String(h.text || '').slice(0, 350)}`).join('\n')}\n`
      : '';
    const userBlock = `Manager universe (${(managers || []).length} managers):\n${mgrBlock}\n${historyBlock}\nLatest user message: ${userMessage}\n\nReturn only { "reply": "..." }.`;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        // Headroom for tables — a 25-row exhibit can easily exceed 1500 tokens of JSON,
        // and a hard cutoff makes the parse fail and dumps raw JSON into the chat.
        max_tokens: 4000,
        system: sys,
        messages: [{ role: 'user', content: userBlock }],
      });
      let text = '';
      for (const block of response.content) if (block.type === 'text') text += block.text;
      const parsed = tryParseJson(text);
      let reply = parsed?.reply;
      let exhibit = parsed?.exhibit || null;
      if (!parsed) {
        // Malformed or truncated JSON — extract the narrative so the user at least sees a
        // sentence rather than the raw model output. Code fences and an unclosed exhibit
        // are common; the reply field is usually intact and at the top of the response.
        const m = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (m) {
          reply = m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
        } else {
          reply = 'Sorry — I had trouble formatting that. Try a more specific question, like “list early-stage VC funds” or “show our private credit funds.”';
        }
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ reply, exhibit }));
    } catch (err) {
      console.error('[demo/route research] error:', err?.message);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Research agent failed. Please try again.' }));
    }
  }

  // Market mode — dashboard of indices, macro prints, and news, with share-with-client suggestions.
  if (isMarket) {
    const m = market || {};
    const indices = Array.isArray(m.indices) ? m.indices.slice(0, 30) : [];
    const macros = Array.isArray(m.macro) ? m.macro.slice(0, 30) : [];
    const news = Array.isArray(m.news) ? m.news.slice(0, 30) : [];
    const clients = Array.isArray(m.clients) ? m.clients.slice(0, 20) : [];

    // Draft-commentary sub-route: when the user clicks "Share with clients" on a
    // news card the frontend asks for a one-paragraph note to send alongside.
    const draftShare = body.draftShare && typeof body.draftShare === 'object' ? body.draftShare : null;
    if (draftShare && draftShare.newsId) {
      const item = news.find((n) => n.id === draftShare.newsId);
      const clientIds = Array.isArray(draftShare.clientIds) ? draftShare.clientIds : [];
      const targets = clientIds.length ? clients.filter((c) => clientIds.includes(c.id)) : clients;
      const clientStr = targets.length ? targets.map((c) => `${c.name}${c.missionHints ? ` (mission: ${c.missionHints})` : ''}`).join('; ') : 'your clients';
      const sys = `You are the market-research agent at an OCIO product called Reve. The user is about to share a market/news item with one or more clients. Draft a SHORT note (2-4 sentences, conversational, no greetings, no signoff) that the user can send alongside the item. Reference what's happening, then tie it to why it matters for the client(s) given their mandate. Avoid jargon and never invent numbers or facts beyond what's in the item / dashboard. Return ONLY a JSON object: { "commentary": "<the draft>" }. No markdown.`;
      const userBlock = item
        ? `News item:\n[${item.tag}] ${item.headline}\n${item.summary}\nTopics: ${(item.topics || []).join(', ')}\n\nClient(s): ${clientStr}\n\nDraft the commentary.`
        : `Draft a brief commentary for sharing a market update with: ${clientStr}.`;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 350,
          system: sys,
          messages: [{ role: 'user', content: userBlock }],
        });
        let text = '';
        for (const block of response.content) if (block.type === 'text') text += block.text;
        const parsed = tryParseJson(text);
        const commentary = (parsed?.commentary || text.trim()).replace(/^"|"$/g, '').slice(0, 1200);
        res.statusCode = 200;
        return res.end(JSON.stringify({ commentary }));
      } catch (err) {
        console.error('[demo/route market draftShare] error:', err?.message);
        res.statusCode = 200;
        return res.end(JSON.stringify({ commentary: '' }));
      }
    }

    const idxBlock = indices.map((i) => `- ${i.name} (${i.region}): ${i.value} · today ${i.todayPct >= 0 ? '+' : ''}${i.todayPct}% · YTD ${i.ytdPct >= 0 ? '+' : ''}${i.ytdPct}%`).join('\n');
    const macroBlock = macros.map((x) => `- ${x.name}: ${x.value} (Δ ${x.delta}) — ${x.context}`).join('\n');
    const newsBlock = news.map((n) => `- id "${n.id}" [${n.tag}] (${n.time}, ${n.source})\n  Headline: ${n.headline}\n  Summary: ${n.summary}\n  Topics: ${(n.topics || []).join(', ')}`).join('\n');
    const clientBlock = clients.map((c) => `- id "${c.id}" — ${c.name} (${c.type || 'client'})${c.missionHints ? ` · mission: ${c.missionHints}` : ''}`).join('\n');
    const sys = `You are the market-research agent inside an OCIO product called Reve. The user is looking at a dashboard of market indices, macro prints, and news items. Your job is to help them (a) understand what matters today, and (b) decide which items to share with which client, given each client's mission and mandate.

Today's date: ${new Date().toISOString().slice(0, 10)}. The market snapshot is for ${m.asOf || 'today'}.

Style: short paragraphs, no markdown headers, no ASCII tables. Use US dollars. Be concrete — name indices, numbers, and news items directly. Never invent data outside the snapshot.

Return ONLY a single JSON object (no markdown fences):
{
  "reply": "<your short answer, 1-3 sentences>",
  "exhibit": null | { ...table or manager_list as in research mode... },
  "shareSuggestions": null | [
    { "newsId": "<id from the news list>", "clientIds": ["<client id>", ...], "reason": "<1-2 sentence rationale tying the news to that client's mandate>" },
    ...
  ]
}

Rules:
- When the user asks "what should I share with <client>?" or "anything that matters for <client>?" — return shareSuggestions with 1-3 items most relevant to that client.
- When the user asks "what's worth sharing today?" without specifying a client — return shareSuggestions tying each suggested item to the right client(s).
- When the user asks for a summary, narrative, or single fact — return a "reply" only.
- When the user asks for a table (e.g. "show me today's top movers"), use an "exhibit" of type "table".
- Match news ids and client ids EXACTLY as provided. If no good match exists, say so in "reply" and skip shareSuggestions.
- The reason field should connect the item to the client's mandate/mission specifically — not just describe the news.`;
    const historyBlock = history.length
      ? `\nConversation so far (oldest first):\n${history.map((h) => `  ${h.role === 'user' ? 'USER' : 'AGENT'}: ${String(h.text || '').slice(0, 350)}`).join('\n')}\n`
      : '';
    const userBlock = `INDICES:\n${idxBlock}\n\nMACRO:\n${macroBlock}\n\nNEWS:\n${newsBlock}\n\nCLIENTS (use these ids for shareSuggestions):\n${clientBlock || '(no saved clients yet)'}\n${historyBlock}\nLatest user message: ${userMessage}\n\nReturn only the JSON object.`;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 900,
        system: sys,
        messages: [{ role: 'user', content: userBlock }],
      });
      let text = '';
      for (const block of response.content) if (block.type === 'text') text += block.text;
      const parsed = tryParseJson(text);
      res.statusCode = 200;
      return res.end(JSON.stringify({
        reply: parsed?.reply || (parsed?.shareSuggestions || parsed?.exhibit ? null : text.trim()),
        exhibit: parsed?.exhibit || null,
        shareSuggestions: Array.isArray(parsed?.shareSuggestions) ? parsed.shareSuggestions : null,
      }));
    } catch (err) {
      console.error('[demo/route market] error:', err?.message);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Market agent failed. Please try again.' }));
    }
  }

  // Tasks mode — natural-language agent over the cross-client task list.
  if (isTasks) {
    const taskBlock = (tasks || []).map((t) => {
      const due = t.due ? ` · due ${t.due}` : '';
      const agent = t.status === 'agent' ? ` [agent: ${t.agentLabel || 'queued'}]` : '';
      return `- (id ${t.id}) [${t.status}]${agent} ${t.title} — ${t.clientName} · ${t.sectionLabel || t.kind}${due}\n    ${(t.detail || '').slice(0, 200)}`;
    }).join('\n');
    const sys = `You are the tasks agent inside an OCIO product called Reve. The user has a cross-client task list. Answer concisely and ground every answer strictly in the task list provided — do not invent tasks or details. The current date is ${new Date().toISOString().slice(0, 10)}.

Statuses: "action" = needs the user to do something, "review" = waiting on user review, "pending" = waiting on someone else, "agent" = Reve's agent is handling it. When summarizing, the user usually cares about "action" and "review" items (the ones for them) more than "agent" items.

Style: short paragraphs, no markdown headers, no ASCII tables. Refer to tasks by their title. Dates in plain English (e.g. "May 17", "next week").

You can return one of three response shapes (return ONLY a JSON object, no markdown fences):

1. Narrative summary / filter — use when the user asks a question, wants a summary, or asks to filter:
   { "reply": "<your answer>", "exhibit": null }

2. Task list — use when listing more than ~2 tasks (each row will be clickable):
   { "reply": "<short context, 1-2 sentences>", "exhibit": { "type": "task_list", "title": "<heading>", "taskIds": ["<id>", "<id>", ...] } }

3. Open / surface a specific task — use when the user says "open X", "let's open the FY27 spending policy", "show me the EM manager item", etc. The frontend will render the task with action buttons:
   { "reply": "<optional 1-sentence lead-in>", "action": { "type": "surface_task", "taskId": "<id>" } }

Pick the right shape:
- "what's due this week?" / "what should I focus on?" / "summarize Dream's open items" → narrative with possible task_list exhibit
- "show me everything pending" / "list the capital calls" → task_list exhibit
- "open the FY27 analysis" / "let's look at the EM manager decision" / "pull up the attestation" → surface_task action
- "how many tasks are agent-handled?" / "anything overdue?" / "what's the status of X?" → narrative reply

Match task ids EXACTLY as given. If no task matches a surface request, return a narrative reply explaining you couldn't find it.`;
    const historyBlock = history.length
      ? `\nConversation so far (oldest first):\n${history.map((h) => `  ${h.role === 'user' ? 'USER' : 'AGENT'}: ${String(h.text || '').slice(0, 350)}`).join('\n')}\n`
      : '';
    const userBlock = `Task list (${(tasks || []).length} open tasks across all clients):\n${taskBlock}\n${historyBlock}\nLatest user message: ${userMessage}\n\nReturn only the JSON object.`;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: sys,
        messages: [{ role: 'user', content: userBlock }],
      });
      let text = '';
      for (const block of response.content) if (block.type === 'text') text += block.text;
      const parsed = tryParseJson(text);
      const reply = parsed?.reply || (parsed?.action ? null : text.trim());
      const exhibit = parsed?.exhibit || null;
      const action = parsed?.action || null;
      res.statusCode = 200;
      return res.end(JSON.stringify({ reply, exhibit, action }));
    } catch (err) {
      console.error('[demo/route tasks] error:', err?.message);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Tasks agent failed. Please try again.' }));
    }
  }

  const sectionList = sections.map((s) => `  ${s.num}. ${String(s.title).slice(0, 80)}`).join('\n');
  const historyBlock = history.length
    ? `\nConversation so far (oldest first; agent answers are summarized):\n${history.map((h) => `  ${h.role === 'user' ? 'USER' : 'AGENT'}: ${String(h.text || '').slice(0, 350)}`).join('\n')}\n`
    : '';
  const materialsBlock = materials.length
    ? `\nClient materials on file (excerpts — the ONLY source for org_info answers; do not invent beyond these):\n${materials.map((m) => `[${String(m.source || 'document').slice(0, 80)}] ${String(m.text || '').slice(0, 1800)}`).join('\n\n')}\n`
    : '';
  const factsBlock = facts
    ? `\nClient profile facts (the CURRENT values — read these when an edit_facts intent fires, and produce a clean rewritten replacement):\n${['mission','spending','cashNeeds','drawdown','constraints','governance'].map((k) => `  ${k}: ${String(facts[k] || '(none)').slice(0, 600)}`).join('\n')}\n`
    : '';
  const userBlock = `Current module: ${currentModule}
Current IPS section in focus: ${currentSectionNum}. ${currentSectionTitle}

All IPS sections:
${sectionList}
${materialsBlock}${factsBlock}${historyBlock}
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
