// Seeds the "Reve CIO Deep Dive" document on first request after deploy.
// Idempotent — once the document exists, the seeder is a no-op so admin
// edits aren't overwritten.

import {
  getDocumentBySlug,
  createDocument,
  updateDocument,
  getSetting,
  setSetting,
} from './db.js';

const SLUG = 'cio-deep-dive';
const TITLE = 'Reve CIO Deep Dive';

// Bump SEED_VERSION when publishing a new canonical seed and you want it
// to replace whatever's currently in the DB on next request.
// WARNING: any admin edits to this doc are overwritten when this number
// is incremented. Only bump when the new seed is the source of truth.
const SEED_VERSION = 2;
const SEED_VERSION_KEY = 'deep_dive_seed_version';

// Stored shape: { meta, pages: [{ body, closing }] }
// Each page's body is raw HTML rendered inside <div class="page-body">.
// Verbatim copy from the source memo; structure preserved.

const DEEP_DIVE_CONTENT = {
  meta: 'Deep Dive &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; {date}',
  pages: [

    // ============ Page 1: Title + Background ===========================
    { body: `<div class="doc-body">
<h1 class="doc-title">An AI-Native OCIO</h1>
<p class="doc-lede">Reve is building an AI-native OCIO to better serve America's most important pools of investment capital, and in doing so support the development of our country's human capital.</p>

<h2 class="doc-section">Background</h2>
<p>OCIO stands for outsourced chief investment officer. These organizations manage portfolios on behalf of institutional pools of capital - typically foundations, endowments, pensions and the like (but also serve family offices and RIAs to a smaller degree). Globally (as of 2025), OCIOs account for $3.3T of assets under management (AUM), with that number forecast to reach $5.78T by 2030. The US share of OCIO managed assets is 75%, currently at $2.5T having grown 16% in 2025 alone - and is expected to reach $4.38T by 2030.<sup class="fn-ref"><a href="#fn1">1</a></sup> At a weighted average blended rate of 15-20bps across the entire market (fee rates step down as clients cross AUM tiers), OCIO services globally represent around $10B in annual revenue.</p>
<p>Defined more broadly, outsourced institutional investment services also include "investment consulting" - this entails non-discretionary advice on how to manage assets (without actually taking on management responsibilities). Globally (as of 2024), investment consultants account for $37T in assets under advisement (AUA), with the US share representing 91.3% ($33.8T) - US AUA grew 6.7% in 2024 and is expected to reach $49.9T by 2030.<sup class="fn-ref"><a href="#fn2">2</a></sup> At a blended rate of 2bps, investment consulting also represents about $10B in annual revenue.</p>
<p>In their current form, OCIO and investment consulting services represent a <strong>$20B revenue opportunity</strong> overall. <strong>The actual opportunity size, however, is much larger</strong>, as only a fraction of relevant institutions employ an investment advisor today. AI-powered systems will significantly lower the cost of delivery and greatly improve quality, expanding access to these services and encouraging more organizations to use them.</p>
</div>`, closing: null },

    // ============ Page 2: Why this market is broken ====================
    { body: `<div class="doc-body">
<h2 class="doc-section">Why this market is broken</h2>
<p>The OCIO industry runs an expensive, analyst-heavy model, prices it as a premium service, and underperforms on average (especially on a net of fees basis). It's based on analysts, spreadsheets, and legacy software. Service quality is highly uneven, and a lack of standardization in reporting leaves room for cherry picking performance and benchmark manipulation. Fee structures, moreover, are often opaque and conflicts of interest are pervasive.</p>
<p>The OCIO playbook has hardly changed since the 1980s:</p>
<ul>
  <li><strong>High-cost, human-intensive.</strong> Every IC package, manager monitoring report, scenario analysis, performance attribution, cash flow model or quarterly board presentation is produced manually by teams of analysts. Team costs are high and technology leverage is very low.</li>
  <li><strong>Premium pricing.</strong> For small to medium-sized clients, a typical blended rate can be around 35bps of AUM (adding in manager fees, fully loaded IM costs can be around 75-175bps - depending on the underlying asset class and manager mix).<sup class="fn-ref"><a href="#fn3">3</a></sup> For smaller endowments and foundations, investment fees can consume a huge fraction of budget that would otherwise be spent on their mission.</li>
  <li><strong>Dispersion and underperformance.</strong> OCIOs had an 8% performance gap between top and bottom quartile over the three years through 2025.<sup class="fn-ref"><a href="#fn4">4</a></sup> After compounding, this translates to 25% over the period. Bottom quartile OCIOs returned just 3.01% in 2024<sup class="fn-ref"><a href="#fn5">5</a></sup>, barely keeping up with inflation.</li>
  <li><strong>Opacity and conflicts.</strong> OCIOs often charge hidden fees, cherry pick their track record, and route compensation through affiliated products and services.</li>
  <li><strong>Large parts of the market are excluded.</strong> Owing to the unit economics of OCIOs, smaller foundations and endowments are excluded or thrown into pooled vehicles with no customization and minimal consideration for organizational objectives.</li>
</ul>
</div>`, closing: null },

    // ============ Page 3: Underserved segment ==========================
    { body: `<div class="doc-body">
<h2 class="doc-section">A huge opportunity in the underserved segment</h2>
<p>There are roughly 20-25k institutional pools of capital between $10m-$250m of AUM in the US.<sup class="fn-ref"><a href="#fn6">6</a></sup> Assuming a weighted average size of $55m, that's about $1.25T in total assets.</p>
<p>Despite its overall size, this segment is served remarkably poorly by the OCIO industry. Only about 40% of this segment uses an OCIO or investment consultant.<sup class="fn-ref"><a href="#fn7">7</a></sup> And those who do receive sub-standard services:</p>
<ul>
  <li>OCIO firms generally pay far less attention to smaller clients</li>
  <li>These clients are often forced into pooled commingled vehicles - a "low cost" option (ends up being <em>very</em> costly after accounting for fully-loaded fees and expenses) with zero customization. A single asset allocation is applied to all clients in the pool that have a similar risk profile. Clients don't receive a tailored investment policy statement (IPS).</li>
  <li>Clients are sometimes offered non-discretionary investment consulting rather than OCIO services (at a lower price); here the provider gives recommendations with no fiduciary accountability and doesn't offer governance or genuine oversight</li>
  <li>Clients are commonly charged exorbitant prices - notably, smaller foundations are often served by RIA firms, which charge 50-60bps of AUM or more.</li>
</ul>
<p>The poor service quality here is structural. Larger OCIO firms don't bother with this segment due to unit economics - each small client represents a similar amount of work as larger ones, but with much less revenue. Meanwhile, the boutique OIO firms that more commonly serve this segment simply can't scale because they're bottlenecked by analyst hours.</p>
<p>It's been shown empirically that institutional portfolios in this segment severely underperform a passive institutional benchmark on a risk-adjusted basis. Andrew Lo (MIT Sloan) et al demonstrate that the average net annual return for endowment funds was 4.3% over a 12-year period, relative to 6.7% for a conservative (endowment-appropriate) multi-asset benchmark - with the average heavily weighed down by smaller organizations.<sup class="fn-ref"><a href="#fn8">8</a></sup></p>
<p><strong>Small endowments represent an enormous OCIO opportunity.</strong> At a (below-market) blended rate of 25bps of AUM, serving the $1.25T (and growing) pool of assets in this segment equates to &gt;$3B in annual revenue. In contrast with incumbents, an AI-native firm - whose economics and scalability would be radically different - would be extremely viable in this segment.</p>
</div>`, closing: null },

    // ============ Page 4: Who are the clients + current players =========
    { body: `<div class="doc-body">
<h2 class="doc-section">Who are the clients</h2>
<p>OCIO clients at the lower-end of the AUM distribution are pre-dominantly:</p>
<ul>
  <li>Private and community foundations</li>
  <li>School and college endowments</li>
  <li>Arts and cultural organizations</li>
  <li>Hospital and health system foundations</li>
</ul>
<p>These organizations have mission-critical obligations: financial aid for students, grants to nonprofits, live performance seasons, patient care, and so forth. But they struggle with the complexity of investment policy creation, governance, regulatory compliance, lack of internal resources and expertise, board and team turnover, and the costs of managing endowment funds. Meanwhile, as government funding dries up for many nonprofit sectors, these organizations are becoming more dependent than ever on endowment fund returns.</p>
<p>What these organizations need from OCIOs is genuine fiduciary accountability, investment policy design and governance, spend modeling, portfolio customization, trading and rebalancing operations, continuous monitoring, clear reporting, assistance with tax matters, and compliance with regulations.</p>

<h2 class="doc-section">Who are the current players</h2>
<p>Of the $1.25T in assets held by the &lt;$250m segment, about 10% is managed by OCIOs providing bespoke discretionary service (bespoke services usually have a minimum client AUM threshold of $100m or more). Around 30% is either managed in pooled vehicles or advised on via non-discretionary consulting. Meanwhile, about <strong>60% is unaddressed by third-party investment management services</strong>.</p>
<p>Some of the main players in this segment include Commonfund, The Investment Fund for Foundations (TIFF), Glenmede, Global Endowment Management, and Verger Capital. There is also a long tail of boutique and regional firms supporting parts of the market.</p>
</div>`, closing: null },

    // ============ Page 5: AUM breakdown exhibit ========================
    { body: `<div class="doc-body">
<h2 class="doc-section">Breakdown of AUM in the &lt;$250m segment</h2>

<div class="exhibit-box">
  <div class="exhibit-box-eyebrow">The gap in plain numbers</div>
  <div class="exhibit-cols">
    <div class="exhibit-col">
      <h4>~$750B unaddressed</h4>
      <p>No meaningful investment oversight. Self-managed by volunteers, served by a bank trust department, or relying on unnamed RIAs with no institutional infrastructure. Approximately 60% of total segment AUM across ~12,000–15,000 institutions.</p>
    </div>
    <div class="exhibit-col">
      <h4>~$338B nominally managed</h4>
      <p>Pooled vehicles (~$150B, one-size portfolio, 150+ bps all-in) or non-discretionary consultants (~$188B, client retains all decisions). Has an advisor but no fiduciary accountability, no customization, no alternatives access.</p>
    </div>
    <div class="exhibit-col">
      <h4>Only ~$163B properly served</h4>
      <p>By a discretionary OCIO with genuine customization. Named providers in this segment all have implicit minimums. Numerous smaller unnamed OCIOs and RIAs serve parts of this market with varying quality.</p>
    </div>
  </div>
</div>

<h3 class="doc-subsection">Share of AUM by provider and service type</h3>
<p class="exhibit-chart-sub">Coverage breakdown of ~$1.25T total sub-$250M E&amp;F AUM, by service type.</p>
<div class="coverage-bar">
  <div class="coverage-segment" style="width: 13%; background: #243478;">13%</div>
  <div class="coverage-segment" style="width: 12%; background: #7a7fc7;">12%</div>
  <div class="coverage-segment" style="width: 15%; background: #5859a6;">15%</div>
  <div class="coverage-segment" style="width: 60%; background: #c98c80;">60%</div>
</div>
<div class="chart-legend">
  <span class="key"><span class="swatch" style="background:#243478"></span>Custom OCIO 13%</span>
  <span class="key"><span class="swatch" style="background:#7a7fc7"></span>Pooled vehicles 12%</span>
  <span class="key"><span class="swatch" style="background:#5859a6"></span>Non-discretionary 15%</span>
  <span class="key"><span class="swatch" style="background:#c98c80"></span>Unaddressed 60%</span>
</div>

<h3 class="doc-subsection">Named providers vs. unaddressed</h3>
<p class="exhibit-chart-sub">Within the ~$1.25T sub-$250M E&amp;F universe, named providers account for a small share; the long tail is dominated by structurally unaddressed AUM.</p>
<div style="margin-top: 6pt;">
  <div class="bar-chart-row"><span class="label">Unaddressed</span><div class="bar" style="width: 100%; background: #c98c80;"></div><span class="pct">60%</span></div>
  <div class="bar-chart-row"><span class="label">Non-discretionary</span><div class="bar" style="width: 25%; background: #5859a6;"></div><span class="pct">15%</span></div>
  <div class="bar-chart-row"><span class="label">Pooled vehicles</span><div class="bar" style="width: 20%; background: #7a7fc7;"></div><span class="pct">12%</span></div>
  <div class="bar-chart-row"><span class="label">Commonfund</span><div class="bar" style="width: 5%; background: #243478;"></div><span class="pct">3%</span></div>
  <div class="bar-chart-row"><span class="label">Other boutiques</span><div class="bar" style="width: 5%; background: #243478;"></div><span class="pct">3%</span></div>
  <div class="bar-chart-row"><span class="label">TIFF</span><div class="bar" style="width: 3.3%; background: #243478;"></div><span class="pct">2%</span></div>
  <div class="bar-chart-row"><span class="label">Glenmede</span><div class="bar" style="width: 3.3%; background: #243478;"></div><span class="pct">2%</span></div>
  <div class="bar-chart-row"><span class="label">GEM</span><div class="bar" style="width: 3.3%; background: #243478;"></div><span class="pct">2%</span></div>
  <div class="bar-chart-row"><span class="label">Verger</span><div class="bar" style="width: 1.7%; background: #243478;"></div><span class="pct">1%</span></div>
</div>
</div>`, closing: null },

    // ============ Page 6: Overview of key providers table ==============
    { body: `<div class="doc-body">
<h2 class="doc-section">Overview of key providers</h2>
<table class="exhibit-table">
  <thead>
    <tr>
      <th>Provider</th>
      <th class="num">Total E&amp;F AUM</th>
      <th class="num">Sub-$250M est.</th>
      <th class="num">Est. clients</th>
      <th class="num">Min. AUM</th>
      <th class="num">Est. headcount</th>
      <th>Key notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="provider">Commonfund OCIO</td>
      <td class="num">~$15B</td>
      <td class="num">~$62B</td>
      <td class="num">~200+</td>
      <td class="num">$25M pooled / $100M custom</td>
      <td class="num">~300 total</td>
      <td>Largest dedicated nonprofit OCIO. Mix of pooled and custom. Nonprofit-only mandate.</td>
    </tr>
    <tr>
      <td class="provider">TIFF</td>
      <td class="num">~$9B</td>
      <td class="num">~$50B</td>
      <td class="num">~100–150</td>
      <td class="num">~$10M (pooled)</td>
      <td class="num">~80–100</td>
      <td>Founded as nonprofit cooperative. Most accessible minimum. TIFF Multi-Asset pool + custom accounts.</td>
    </tr>
    <tr>
      <td class="provider">Glenmede E&amp;F</td>
      <td class="num">~$4–5B</td>
      <td class="num">~$25B</td>
      <td class="num">250+</td>
      <td class="num">~$10M</td>
      <td class="num">~400 firmwide</td>
      <td>Trust company. 250+ nonprofit clients. Serves smaller pools via trust relationships.</td>
    </tr>
    <tr>
      <td class="provider">Global Endowment Mgmt</td>
      <td class="num">~$11B</td>
      <td class="num">~$25B</td>
      <td class="num">~50–70</td>
      <td class="num">~$100M</td>
      <td class="num">~60–80</td>
      <td>Duke model externalized. Charlotte-based. Highly selective; avg client well above $250M.</td>
    </tr>
    <tr>
      <td class="provider">Verger Capital</td>
      <td class="num">~$2.9B</td>
      <td class="num">~$13B</td>
      <td class="num">~10–15</td>
      <td class="num">~$50M</td>
      <td class="num">~20–30</td>
      <td>10 clients per 2025 ADV. Pure nonprofit. Sub-$100M via pooled access to Verger portfolio.</td>
    </tr>
    <tr>
      <td class="provider">Other boutiques</td>
      <td class="num">Various</td>
      <td class="num">~$38B</td>
      <td class="num">~200–400</td>
      <td class="num">$25–75M</td>
      <td class="num">Varies</td>
      <td>FEG, Marquette, Hirtle tail, regional OCIOs. Field contracting via consolidation.</td>
    </tr>
    <tr>
      <td class="provider">Pooled vehicles</td>
      <td class="num">Incl. above</td>
      <td class="num">~$200B</td>
      <td class="num">500–1000+</td>
      <td class="num">$1–10M</td>
      <td class="num">N/A</td>
      <td>Commonfund, TIFF Multi-Asset Fund. One-size portfolio by risk tier. 150+ bps all-in. No customization.</td>
    </tr>
    <tr>
      <td class="provider">Non-discretionary consultants</td>
      <td class="num">~$33T AUA</td>
      <td class="num">~$240B</td>
      <td class="num">5,000+</td>
      <td class="num">Any</td>
      <td class="num">N/A</td>
      <td>NEPC, Callan, boutiques. Advisory only — client retains all decisions. ~2 bps on AUA.</td>
    </tr>
  </tbody>
</table>
</div>`, closing: null },

    // ============ Page 7: Why OCIO is the next AI frontier ==============
    { body: `<div class="doc-body">
<h2 class="doc-section">Why OCIO is the next frontier for AI services</h2>
<p>The traditional OCIO cost structure is almost entirely labor - more specifically information labor, not judgment labor. OCIO services are mostly a series of dense information processing tasks and time-consuming operational steps requiring substantial domain expertise and (today) delivered manually. As a result, these services are very expensive and hard to scale.</p>
<p>In the future, all of the information processing and task execution will be done by AI, and only the final judgments will be (mostly) left to humans. With a strong data foundation and embedded domain knowledge, the processing and execution steps currently done by human analysts are extremely well-suited to AI agents. Below are key examples of how AI agents will take over OCIO analyst work:</p>
<ul>
  <li><strong>Portfolio construction</strong> - AI agents gather information about client objectives, market dynamics, and managers. They synthesize the information into a portfolio model, build and analyze scenarios, generate recommendations, document methodologies, prepare presentation materials, implement allocations through custodians, and rebalance as needed.</li>
  <li><strong>Manager research</strong> - Agents look across vast structured and unstructured data sets to pattern match; they can self-learn what makes a good manager, identify potential alpha better than human analysts, match managers to portfolio goals and ensure selected managers are complementary to each other.</li>
  <li><strong>Governance</strong> - AI agents onboard new clients, design and draft Investment Policy Statements, make updates when needed. They ensure ongoing compliance vis-a-vis the IPS as well as regulatory requirements. They document every decision, provide a full audit trail, and generate all necessary documents and filings.</li>
  <li><strong>Monitoring/Reporting</strong> - AI agents reconcile numbers, generate exhibits, research market context, and even build narratives. They can explain portfolio performance and answer ad hoc client questions. They can monitor portfolios continuously and suggest adjustments based on findings.</li>
</ul>
<p>The reason an AI services model hasn't reached the OCIO industry to date is likely because the technical challenge is greater (relative to, say, AI law for contracts or AI accounting for financial statements) - there are more degrees of freedom and fewer clear right answers. But with the right data foundation and domain knowledge, an AI-native OCIO is technically achievable. Moreover, because it's more difficult than other AI services, our business will be more defensible and durable than the legal or accounting equivalents. Given the nature of OCIO services (long-term, trust-based, high switching cost), our client relationships will also be far stickier.</p>
</div>`, closing: null },

    // ============ Page 8: What we plan to build ========================
    { body: `<div class="doc-body">
<h2 class="doc-section">What we plan to build</h2>
<p>For its data foundation, Reve will use existing operational infrastructure. Our platform will initially integrate with portfolio aggregation and reporting solutions (e.g. Addepar), market data solutions (e.g. Bloomberg, Pitchbook), ops solutions (e.g. Arch), custody (e.g. Fidelity, Schwab), and manager sourcing (e.g. Opto). On top of this, we will build the agentic layer for all core OCIO workflows (as a single unified system):</p>
<ul>
  <li>Onboarding</li>
  <li>Investment Policy Statement (IPS) design</li>
  <li>Spend policy and cash flow modeling</li>
  <li>Portfolio customization</li>
  <li>Scenario analysis</li>
  <li>Investment selection and diligence</li>
  <li>Trade execution/operations</li>
  <li>Continuous portfolio monitoring</li>
  <li>Tax optimization</li>
  <li>IPS and regulatory compliance</li>
  <li>Reporting and board updates</li>
  <li>Ad hoc responses to questions and research requests</li>
</ul>
<p>While most of these workflows will be done agentically, we will of course have analysts in the loop for steps where human context or judgment is needed.</p>
<p>Though point solutions exist to help with some of these steps, we want to own them ourselves and build them in AI-native fashion from the ground up because 1) the legacy solutions in this space are rigid and have very limited capabilities and 2) the different workflows are so interconnected that AI agents need to be able to share context and operate across steps smoothly.</p>
<p>Later, we may also replace infrastructure-level integration partners if we feel the need to remove dependencies or believe we can obtain additional leverage by building better solutions than what they offer.</p>

<div class="callout">
  <h3>A note on efficiency</h3>
  <p>By building the agentic layer for all OCIO workflows, our services will be vastly more efficient than those offered by legacy firms. In the current, mostly manual state, a typical ratio of AUM per employee is around $100m. At typical fee rates, this covers the cost of the employee plus a narrow additional margin. We believe that we'll easily be able to achieve $1B+ of AUM per employee - even with significantly reduced pricing, we will dramatically transform the margin profile and unit economics of the OCIO business.</p>
  <p>In other words, we'll be able to charge lower fees for 10x better service and outcomes.</p>
</div>
</div>`, closing: null },

    // ============ Page 9: GTM + Scale + Software licensing =============
    { body: `<div class="doc-body">
<h2 class="doc-section">How we'll approach the market</h2>
<p>Our initial target (broadly speaking) is the &lt;$250m segment of the market where, for the reasons described above, there is a huge opportunity to provide materially better service while achieving far better unit economics. Currently, a typical blended OCIO rate in this segment looks like 30-35bps (which, for a traditional OCIO, is not always attractive or even viable). We will offer a radically cheaper price point at around 15bps while providing better service and producing better financial outcomes. Our pricing will also be radically transparent - we will publish our fee schedule on our website and stick to it. It will have no obfuscated layers and no transition costs or any other hidden expenses.</p>
<p>Our initial focus will be community foundations, educational endowments, and arts/cultural organizations - these organizations are most underserved, face budget pressure, and have an acute need for better financial outcomes. We will reach these clients (and demonstrate credibility) via our team and advisory board. We'll also strategically respond to certain public RFPs that we think we're well-positioned to win.</p>

<h2 class="doc-section">How we'll scale</h2>
<p>As noted above, we'll build an agentic system across all OCIO workflows, which will enable us to scale across many clients very quickly. We'll also create AI agents for identifying prospective clients and responding to RFPs, which will give us unprecedented reach and fast conversion across the market.</p>
<p>Meanwhile, we'll consider strategic acquisitions of existing OCIO firms - acquisitions could potentially enable us to rapidly scale AUM, adopt historical track records, increase credibility, and incorporate existing best practices into our agentic system. A boutique OCIO managing $2B might have $5m in annual revenue and $1m EBITDA. An 8-12x multiple would suggest such a firm would cost $8m-$12m to acquire. The $2B of assets and associated track record is worth gold in the early stages of our business, and over time we can also expand the acquired firm's margins from around 20% to as high as 75%.</p>
<p>Once we're established with our early ICP, we'll rapidly move toward serving larger organizations (&gt;$250m AUM) and additional client types (e.g. hospitals, pensions, which have more regulatory and budgetary complexity). We'll also consider international expansion.</p>

<h2 class="doc-section">Software licensing</h2>
<p>After building the agentic system for endowment fund management, we can deploy and license our software to the more sophisticated pools of capital that will likely always want to keep their investment management in-house. These groups include large university endowments like Yale, sovereign wealth funds like GIC, and pensions such as Texas Teachers. They have massive pain points in areas like portfolio construction, investment selection, and portfolio monitoring that can be addressed by using the agentic frameworks we will have created plus forward-deployed customization at the edges. Contracts in this segment will be in the millions and while Anthropic or OpenAI may try to play here, we believe they will not be able to compete with our portfolio modeling capabilities, the data we will have amassed on investment outcomes, and the deep domain expertise we will have accumulated.</p>
</div>`, closing: null },

    // ============ Page 10: Appendix - Software providers ===============
    { body: `<div class="doc-body">
<h2 class="doc-section">Appendix</h2>

<h3 class="doc-subsection">Software providers</h3>
<p>There are a lot of limited (usually legacy) and often expensive point solutions for different parts of the investment management process, as well as generic AI solutions that can help with certain steps. Many of these solutions target very high-end clients and are far too expensive for an average endowment or the OCIO firms that serve them.</p>
<p>Meanwhile, significant OCIO workflows don't have any dedicated solution and are still handled primarily in Excel.</p>
<p>These solutions as well as manual steps are noted below (this excludes data infrastructure software that is not part of the agentic OCIO scope, such as Addepar or Pitchbook).</p>
<p class="label-em">Point solutions / manual steps</p>
<ul>
  <li>Onboarding - Manual</li>
  <li>IPS design and governance - Manual/excel</li>
  <li>Spend policy and cash flow modeling - Manual/excel</li>
  <li>Portfolio construction, risk, scenario analysis - Two Sigma Venn, BlackRock Aladdin, Jacobi, Charles River IMS, FactSet, Bloomberg PORT, MSCI RiskMetrics</li>
  <li>Manager selection - Vantager, F2, Hebbia, Hamilton Lane Cobalt</li>
  <li>Continuous portfolio monitoring - Manual (outside of basics provided by Addepar and its competitors)</li>
  <li>Tax optimization - Manual/excel</li>
  <li>Compliance - Manual/excel</li>
  <li>Reporting and board updates - LLMs, Hebbia, Manual/slides</li>
  <li>Ad hoc questions and requests - Manual</li>
</ul>
</div>`, closing: null },

    // ============ Page 11: Market concentration + Top 15 chart ==========
    { body: `<div class="doc-body">
<h3 class="doc-subsection">OCIO market concentration / distribution</h3>
<p>The landscape of OCIO providers in the underserved segment is discussed above. This is an overview of the complete OCIO landscape - across the entire market.</p>
<p>Once again, the overall market is $3.3T in global OCIO AUM (75% in US) and $37T in investment consulting AUA (91% in US).</p>
<p>The OCIO market is concentrated at the high end, with the top providers (listed below) accounting for roughly two thirds of total assets. The rest is served by a long-tail of small to medium sized firms; there are thousands below $10B in assets, roughly 95% of the total number of firms in the industry. The long-tail offers an immense opportunity for an AI-native provider to achieve scale and potentially also grow via acquisitions.</p>

<div class="exhibit-chart-title">Top 15 institutional OCIO providers</div>
<p class="exhibit-chart-sub">% label = share of self-reported universe · Skorina Spring 2025 · RIA-primary firms excluded</p>
<div class="chart-legend" style="margin-bottom: 6pt;">
  <span class="key"><span class="swatch" style="background:#2b3038"></span>Pension-primary</span>
  <span class="key"><span class="swatch" style="background:#2b50c4"></span>E&amp;F-focused</span>
  <span class="key"><span class="swatch" style="background:#8a6fc4"></span>Mixed institutional</span>
</div>

<div class="bar-chart-row"><span class="label">Mercer</span><div class="bar" style="width: 100%; background: #2b3038;"></div><span class="pct">12.6%</span></div>
<div class="bar-chart-row"><span class="label">Goldman Sachs</span><div class="bar" style="width: 62%; background: #2b3038;"></div><span class="pct">7.9%</span></div>
<div class="bar-chart-row"><span class="label">BlackRock</span><div class="bar" style="width: 57%; background: #2b3038;"></div><span class="pct">7.2%</span></div>
<div class="bar-chart-row"><span class="label">Russell Investments</span><div class="bar" style="width: 54%; background: #8a6fc4;"></div><span class="pct">6.8%</span></div>
<div class="bar-chart-row"><span class="label">Morgan Stanley</span><div class="bar" style="width: 33%; background: #2b3038;"></div><span class="pct">4.1%</span></div>
<div class="bar-chart-row"><span class="label">J.P. Morgan (E&amp;F)</span><div class="bar" style="width: 33%; background: #2b50c4;"></div><span class="pct">4.1%</span></div>
<div class="bar-chart-row"><span class="label">SEI Institutional</span><div class="bar" style="width: 33%; background: #2b3038;"></div><span class="pct">4.1%</span></div>
<div class="bar-chart-row"><span class="label">AON</span><div class="bar" style="width: 31%; background: #2b3038;"></div><span class="pct">3.9%</span></div>
<div class="bar-chart-row"><span class="label">State Street</span><div class="bar" style="width: 29%; background: #2b3038;"></div><span class="pct">3.6%</span></div>
<div class="bar-chart-row"><span class="label">WTW</span><div class="bar" style="width: 27%; background: #2b3038;"></div><span class="pct">3.4%</span></div>
<div class="bar-chart-row"><span class="label">NEPC</span><div class="bar" style="width: 21%; background: #2b50c4;"></div><span class="pct">2.7%</span></div>
<div class="bar-chart-row"><span class="label">Wilshire</span><div class="bar" style="width: 20%; background: #8a6fc4;"></div><span class="pct">2.5%</span></div>
<div class="bar-chart-row"><span class="label">Bank of America</span><div class="bar" style="width: 17%; background: #8a6fc4;"></div><span class="pct">2.1%</span></div>
<div class="bar-chart-row"><span class="label">Northern Trust</span><div class="bar" style="width: 15%; background: #8a6fc4;"></div><span class="pct">1.9%</span></div>
<div class="bar-chart-row"><span class="label">Cambridge Associates</span><div class="bar" style="width: 12%; background: #2b50c4;"></div><span class="pct">1.5%</span></div>
</div>`, closing: null },

    // ============ Page 12: Footnotes ====================================
    { body: `<div class="footnotes">
<h2>Notes</h2>
<ol>
  <li id="fn1"><a href="https://www.skorinaletter.com/" target="_blank" rel="noopener">US OCIO Market Reached $2.5T in 2025</a></li>
  <li id="fn2"><a href="https://www.thinkingaheadinstitute.org/research-papers/global-top-50-investment-consultants/" target="_blank" rel="noopener">Investment Consultants 2024 Report and Analysis</a></li>
  <li id="fn3">Based on data from NACUBO, Cerulli, Callan, S&amp;P Global</li>
  <li id="fn4"><a href="https://www.ai-cio.com/news/portfolio-construction-drives-wedge-between-the-best-and-worst-performing-endowments/" target="_blank" rel="noopener">Portfolio Construction Drives Wedge Between the Best and Worst Performing Endowments</a></li>
  <li id="fn5"><a href="https://www.ai-cio.com/news/the-returns-gap-between-the-best-and-worst-ocios-for-endowments-is-the-largest-in-years/" target="_blank" rel="noopener">The Returns Gap Between the Best and Worst OCIOs for Endowments Is the Largest in Years</a></li>
  <li id="fn6">Based on data from NACUBO, Inside Philanthropy, Chronicle of Philanthropy, CFRTI</li>
  <li id="fn7">Based on data from NACUBO, Cerulli</li>
  <li id="fn8"><a href="https://alo.mit.edu/wp-content/uploads/2015/06/RiskRewardEndowmentsCFAR-2014.pdf" target="_blank" rel="noopener">The Risk, Reward, and Asset Allocation of Nonprofit Endowment Funds</a></li>
</ol>
</div>`, closing: null },
  ],
};

let seededInProcess = false;
async function seedDeepDiveIfMissing() {
  if (seededInProcess) return;
  const existing = await getDocumentBySlug(SLUG);
  const storedVersion = Number(await getSetting(SEED_VERSION_KEY, 0)) || 0;

  if (!existing) {
    await createDocument({ slug: SLUG, title: TITLE, content: DEEP_DIVE_CONTENT });
    await setSetting(SEED_VERSION_KEY, SEED_VERSION);
  } else if (storedVersion < SEED_VERSION) {
    // One-time replacement when the canonical seed has been updated.
    await updateDocument(SLUG, { title: TITLE, content: DEEP_DIVE_CONTENT });
    await setSetting(SEED_VERSION_KEY, SEED_VERSION);
  }
  seededInProcess = true;
}

async function forceReseedDeepDive() {
  const existing = await getDocumentBySlug(SLUG);
  if (existing) {
    await updateDocument(SLUG, { title: TITLE, content: DEEP_DIVE_CONTENT });
  } else {
    await createDocument({ slug: SLUG, title: TITLE, content: DEEP_DIVE_CONTENT });
  }
  await setSetting(SEED_VERSION_KEY, SEED_VERSION);
}

export {
  seedDeepDiveIfMissing,
  forceReseedDeepDive,
  SLUG,
  TITLE,
  DEEP_DIVE_CONTENT,
  SEED_VERSION,
};
