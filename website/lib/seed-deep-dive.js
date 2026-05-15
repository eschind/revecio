// Seeds the "Reve CIO Deep Dive" document on first request after deploy.
// Idempotent — once the document with this slug exists, the seeder is a no-op.

import { getDocumentBySlug, createDocument } from './db.js';
import { structuredToStored } from './doc-store.js';

const SLUG = 'cio-deep-dive';
const TITLE = 'Reve CIO Deep Dive';

const DEEP_DIVE_STRUCTURED = {
  meta: 'Deep Dive &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; {date}',
  pages: [
    // ============ Page 1: Intro + Market =================================
    {
      lede: `Reve is building an <em>AI-native OCIO</em> to better serve America's most important pools of investment capital — and in doing so, support the development of our country's human capital.`,
      sections: [
        {
          num: '01',
          label: 'The market',
          body: `<p><strong>OCIO</strong> — outsourced chief investment officer — firms manage portfolios on behalf of institutional pools of capital, typically foundations, endowments, and pensions (and to a smaller degree family offices and RIAs). Globally, OCIOs account for <strong>$3.3T</strong> in AUM as of 2025, projected to reach <strong>$5.78T by 2030</strong>. The U.S. accounts for ~75% of OCIO AUM — currently $2.5T, having grown 16% in 2025 alone, projected to reach $4.38T by 2030. At a 15–20 bps blended rate, OCIO services globally represent ~$10B in annual revenue.</p>
          <p>Defined more broadly, outsourced institutional investment services also include <strong>investment consulting</strong> — non-discretionary advice on how to manage assets without taking on management responsibility. Globally, consultants advise on <strong>$37T</strong> in AUA; the U.S. share is $33.8T, growing ~6.7% in 2024 and projected to reach $49.9T by 2030. At a 2 bps blended rate, consulting represents another ~$10B in annual revenue.</p>
          <p>Combined, OCIO and investment consulting represent a <strong>$20B annual revenue opportunity</strong> in their current form. <strong>The actual opportunity is materially larger</strong> — only a fraction of relevant institutions employ an advisor today. AI-powered systems will significantly lower the cost of delivery and improve quality, expanding access to these services and encouraging more organizations to use them.</p>`,
          stats: [
            ['$3.3T', 'global OCIO AUM; $5.78T projected by 2030'],
            ['$37T', 'global investment consulting AUA; 91% U.S.'],
            ['$20B', 'combined revenue opportunity today — larger when AI expands access'],
          ],
        },
      ],
    },

    // ============ Page 2: Why broken =====================================
    {
      sections: [
        {
          num: '02',
          label: 'Why the market is broken',
          body: `<p>The OCIO industry runs an expensive, analyst-heavy model, prices it as a premium service, and underperforms on average — especially on a net-of-fees basis. It's based on analysts, spreadsheets, and legacy software. Service quality is highly uneven, and a lack of reporting standardization leaves room for cherry-picking and benchmark manipulation. Fee structures are often opaque and conflicts of interest are pervasive. The OCIO playbook has hardly changed since the 1980s.</p>
          <ul>
            <li><strong>High-cost, human-intensive.</strong> Every IC package, manager monitoring report, scenario analysis, performance attribution, cash-flow model, and quarterly board presentation is produced manually by teams of analysts. Team costs are high and technology leverage is very low.</li>
            <li><strong>Premium pricing.</strong> For small to medium clients, a typical blended rate runs ~35 bps of AUM; fully loaded fees (with manager fees) can reach 75–175 bps depending on asset class and manager mix. For smaller endowments and foundations, investment fees consume a huge fraction of budget that would otherwise be spent on mission.</li>
            <li><strong>Dispersion and underperformance.</strong> OCIOs had an <strong>8% performance gap</strong> between top and bottom quartile over the three years through 2025 — a <strong>25% compounded gap</strong>. Bottom-quartile OCIOs returned just <strong>3.01% in 2024</strong>, barely tracking inflation.</li>
            <li><strong>Opacity and conflicts.</strong> Hidden fees, cherry-picked track records, and compensation routed through affiliated products and services are pervasive.</li>
            <li><strong>Large parts of the market are excluded.</strong> Owing to OCIO unit economics, smaller foundations and endowments are excluded or thrown into pooled vehicles with no customization and minimal consideration for organizational objectives.</li>
          </ul>`,
        },
      ],
    },

    // ============ Page 3: Underserved segment ============================
    {
      sections: [
        {
          num: '03',
          label: 'The underserved segment',
          body: `<p>There are roughly <strong>20–25k institutional pools of $10M–$250M</strong> AUM in the U.S. Assuming a weighted average of ~$55M, that's about <strong>$1.25T in total assets</strong>.</p>
          <p>Despite its size, this segment is served remarkably poorly. Only <strong>~40% use an OCIO or investment consultant</strong>, and those who do receive sub-standard service:</p>
          <ul>
            <li>OCIO firms generally pay far less attention to smaller clients</li>
            <li>Clients are often forced into pooled commingled vehicles — a "low cost" option (very costly after fully loaded fees) with zero customization. A single asset allocation is applied to all clients in the pool with a similar risk profile.</li>
            <li>Clients are sometimes offered non-discretionary consulting rather than discretionary OCIO — at a lower price but with no fiduciary accountability and no governance.</li>
            <li>Clients are commonly charged exorbitant prices — smaller foundations are often served by RIA firms at 50–60 bps of AUM or more.</li>
          </ul>
          <p>The poor service quality here is <strong>structural</strong>. Larger OCIO firms can't make the unit economics work — small clients require similar effort to large ones, but with much less revenue. Meanwhile, the boutique OCIOs that do serve this segment can't scale because they're bottlenecked by analyst hours.</p>
          <p>Empirically, institutional portfolios in this segment significantly underperform a passive institutional benchmark on a risk-adjusted basis. Andrew Lo (MIT Sloan) et al. demonstrate that the <strong>average net annual return for endowment funds was 4.3%</strong> over a 12-year period vs. <strong>6.7% for an endowment-appropriate multi-asset benchmark</strong> — with the average weighed down by smaller organizations.</p>`,
          stats: [
            ['$1.25T', 'in 20–25k pools of $10M–$250M — structurally underserved'],
            ['~60%', 'of segment AUM is unaddressed by any third-party investment manager'],
            ['~$3B', 'annual revenue opportunity at a below-market 25 bps blended rate'],
          ],
        },
      ],
    },

    // ============ Page 4: Clients + Current providers ====================
    {
      sections: [
        {
          num: '04',
          label: 'Who we serve',
          body: `<p>OCIO clients at the lower end of the AUM distribution are predominantly mission-driven institutions whose returns underwrite essential programs — and which struggle with the complexity of modern investment management, governance, compliance, lean internal teams, and board and staff turnover. As government funding recedes, dependence on portfolio returns is rising.</p>`,
          pillars: [
            ['Private and community foundations', `Steward philanthropic capital with strict spend requirements. Need IPS design, governance, and reliable distributions to fund grants.`],
            ['School and college endowments', `Fund financial aid, faculty, and operations. Need long-duration portfolios that match institutional time horizons.`],
            ['Arts and cultural organizations', `Underwrite performance seasons, exhibitions, and programming. Smaller AUM, less infrastructure, acute budget pressure.`],
            ['Hospital and health-system foundations', `Bridge clinical operations and philanthropic missions; subject to regulatory and reporting complexity.`],
          ],
        },
        {
          num: '05',
          label: 'Current providers',
          body: `<p>Of the $1.25T in the sub-$250M segment, <strong>only ~10% is managed by OCIOs offering bespoke discretionary service</strong> (these typically have $100M+ minimums). ~30% sits in pooled vehicles or non-discretionary consulting. <strong>About 60% — roughly $750B — is unaddressed entirely</strong>: self-managed by volunteers, served by a bank trust department, or relying on unnamed RIAs with no institutional infrastructure.</p>
          <p>Named providers in this segment include <strong>Commonfund, TIFF, Glenmede, Global Endowment Management, and Verger Capital</strong>, plus a long tail of boutique and regional firms. All face the same structural ceiling — they cannot scale beyond what their analyst headcount allows.</p>`,
        },
      ],
    },

    // ============ Page 5: Why AI ========================================
    {
      sections: [
        {
          num: '06',
          label: 'Why OCIO is the next frontier for AI services',
          body: `<p>The traditional OCIO cost structure is almost entirely <strong>information labor, not judgment labor</strong> — a series of dense processing tasks and operational steps that require substantial domain expertise and, today, are delivered manually. As a result, services are expensive and hard to scale.</p>
          <p>In the future, the information processing and task execution are done by AI; only final judgments are (mostly) left to humans. With a strong data foundation and embedded domain knowledge, the steps currently done by human analysts are very well-suited to agents:</p>`,
          pillars: [
            ['Portfolio construction', `Agents gather information about client objectives, market dynamics, and managers; synthesize into a portfolio model; build and analyze scenarios; generate recommendations; document methodologies; prepare materials; implement allocations through custodians; rebalance.`],
            ['Manager research', `Agents look across vast structured and unstructured data sets to pattern-match. They self-learn what makes a good manager, identify potential alpha better than human analysts, and match managers to portfolio goals.`],
            ['Governance', `Agents onboard new clients, draft IPS documents, update them as needed, ensure ongoing compliance vs. IPS and regulations, and document every decision with a full audit trail.`],
            ['Monitoring & reporting', `Agents reconcile numbers, generate exhibits, research market context, build narratives, explain performance, answer ad-hoc trustee questions, monitor portfolios continuously, and suggest adjustments based on findings.`],
          ],
          callout: {
            title: "Why this hasn't happened yet — and why that's the moat",
            body: `<p>An AI services model hasn't reached OCIO yet because the technical challenge is greater than, say, AI for contracts or accounting — more degrees of freedom and fewer clean right answers. But with the right data foundation and domain knowledge, an AI-native OCIO is achievable.</p>
            <p>Because it's harder than peers, our business will be <strong>more defensible and durable</strong> than equivalents in legal or accounting. Combined with the long-term, trust-based, high-switching-cost nature of OCIO, this produces materially stickier client economics.</p>`,
          },
        },
      ],
    },

    // ============ Page 6: What we're building ============================
    {
      sections: [
        {
          num: '07',
          label: "What we're building",
          body: `<p>Reve uses existing infrastructure as its data foundation — integrating with portfolio aggregation and reporting (e.g. Addepar), market data (Bloomberg, Pitchbook), operations (Arch), custody (Fidelity, Schwab), and manager sourcing (Opto). On top of this we build an <strong>agentic layer across every core OCIO workflow as a single unified system</strong>:</p>
          <ul>
            <li>Onboarding</li>
            <li>Investment Policy Statement (IPS) design</li>
            <li>Spend policy and cash-flow modeling</li>
            <li>Portfolio customization</li>
            <li>Scenario analysis</li>
            <li>Investment selection and diligence</li>
            <li>Trade execution and operations</li>
            <li>Continuous portfolio monitoring</li>
            <li>Tax optimization</li>
            <li>IPS and regulatory compliance</li>
            <li>Reporting and board updates</li>
            <li>Ad-hoc responses to questions and research requests</li>
          </ul>
          <p>Most workflows are handled agentically; analysts remain in the loop where context or judgment is needed.</p>
          <p>Though point solutions exist for some of these steps, we want to own them ourselves and build them in AI-native fashion from the ground up because (1) legacy solutions are rigid with limited capabilities, and (2) the workflows are so interconnected that agents need to share context and operate across steps smoothly. We may also replace integration partners over time if we can build better alternatives.</p>`,
          callout: {
            title: 'A note on efficiency',
            body: `<p>Today the OCIO ratio is roughly <strong>$100M AUM per employee</strong> — at typical fees, that covers the employee plus a narrow margin. We expect to reach <strong>$1B+ AUM per employee</strong>. Even with significantly reduced pricing, this transforms the margin profile of the business — and lets us charge lower fees for 10× better service and outcomes.</p>`,
          },
        },
      ],
    },

    // ============ Page 7: GTM, scaling, software licensing, closing ======
    {
      sections: [
        {
          num: '08',
          label: 'How we approach the market',
          body: `<p>Our initial target is the <strong>$10M–$250M segment</strong>. Typical blended OCIO rates here are 30–35 bps; Reve offers <strong>~15 bps with better service and better financial outcomes</strong>. Pricing is <strong>radically transparent</strong> — fee schedule published on our website, no obfuscated layers, no transition costs, no hidden expenses.</p>
          <p>Initial focus: community foundations, educational endowments, and arts/cultural organizations — the most underserved segment with the most acute budget pressure. We reach them via team credibility and advisory board relationships, and strategically respond to public RFPs we're well-positioned to win.</p>`,
        },
        {
          num: '09',
          label: 'How we scale',
          pillars: [
            ['Agentic distribution', `AI agents identify prospects, respond to public RFPs at scale, and demonstrate credibility via team and advisory board. Speed and reach unprecedented for OCIO.`],
            ['Strategic acquisitions', `A boutique $2B OCIO with ~$5M revenue and $1M EBITDA costs $8–12M to acquire (8–12× EBITDA). Gives instant AUM, track record, and best practices; we can expand margins from ~20% to as high as 75% post-integration.`],
            ['Upmarket expansion', `From the underserved wedge into >$250M institutions, hospitals, and pensions; eventually family offices, boutique RIAs, and international markets.`],
            ['Software licensing', `License the agentic platform to large endowments (e.g. Yale), sovereign funds (e.g. GIC), and pensions (e.g. Texas Teachers) that keep investing in-house. Multi-million-dollar contracts, defensible against horizontal AI labs via domain depth and proprietary outcome data.`],
          ],
        },
      ],
      closing: {
        line: `We're building the investment platform institutions deserve.`,
        contact: `Contact &nbsp;·&nbsp; <strong>eytan@revecio.com</strong> &nbsp;·&nbsp; revecio.com`,
      },
    },
  ],
};

let seededInProcess = false;
async function seedDeepDiveIfMissing() {
  if (seededInProcess) return;
  const existing = await getDocumentBySlug(SLUG);
  if (existing) {
    seededInProcess = true;
    return;
  }
  const content = structuredToStored(DEEP_DIVE_STRUCTURED);
  await createDocument({ slug: SLUG, title: TITLE, content });
  seededInProcess = true;
}

export { seedDeepDiveIfMissing, SLUG, TITLE, DEEP_DIVE_STRUCTURED };
