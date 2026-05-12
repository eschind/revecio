// Default memo content. Phase 2 will move this to the DB and add a web admin
// editor so this only acts as the seed.

const DEFAULT_MEMO = {
  meta: 'Investor Memo &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; {date}',
  pages: [
    {
      lede: `Reve is building an <em>AI-native OCIO</em> to better serve America's most important pools of investment capital — and in doing so, strengthen the institutions that sustain our country's human capital.`,
      sections: [
        {
          num: '01',
          label: 'The market',
          body: `<p>Globally, outsourced CIO (OCIO) and investment consulting services manage and advise on <strong>$3.3T and $37T</strong> of institutional capital respectively — generating over <strong>$16.5B in annual revenue</strong>. The U.S. accounts for ~75% of OCIO AUM ($2.5T) and is growing 16% per year; the U.S. OCIO market alone is projected to reach $4.4T by 2030. Most of this market is served by an analyst-heavy, spreadsheet-based model that has not structurally changed since the 1980s.</p>`,
          stats: [
            ['$2.5T', 'U.S. OCIO AUM today (16% YoY); $4.4T projected by 2030'],
            ['$16.5B', 'global annual revenue across OCIO + investment consulting'],
            ['$1.25T', 'in 20–25k institutional pools of $10M–$250M — structurally underserved'],
          ],
        },
        {
          num: '02',
          label: "Why it's broken",
          body: `<ul>
            <li><strong>High-cost, human-intensive.</strong> Every IC package, monitoring report, scenario analysis, performance attribution, and board deck is produced manually by analysts. Technology leverage is near zero.</li>
            <li><strong>Premium pricing.</strong> Blended rates for sub-$250M clients typically run 30–40 bps; fully loaded fees (including manager costs) can reach 75–175 bps — consuming budget that would otherwise fund mission.</li>
            <li><strong>Dispersion and underperformance.</strong> 8% spread between top- and bottom-quartile OCIO returns over the three years through 2025 — a 25% compounded gap. Bottom-quartile returned just 3% in 2024, barely tracking inflation.</li>
            <li><strong>Opacity and conflicts.</strong> Hidden fees, cherry-picked track records, and compensation routed through affiliated products are pervasive.</li>
            <li><strong>Exclusion of smaller institutions.</strong> Unit economics push small foundations and endowments into one-size-fits-all pooled vehicles or low-touch consulting. <strong>~60% of the $1.25T sub-$250M segment is unaddressed</strong> by any third-party investment management service.</li>
          </ul>`,
        },
        {
          num: '03',
          label: 'The underserved segment',
          body: `<p>20,000–25,000 institutional pools between $10M and $250M — community foundations, school and college endowments, arts and cultural organizations, and hospital foundations — collectively manage <strong>~$1.25T</strong>. Only ~40% use an OCIO or consultant; of those, most receive standardized pooled vehicles or non-discretionary advice with no fiduciary accountability. At a transparent 15–20 bps blended rate, serving this segment alone is a ~<strong>$2B annual revenue opportunity</strong>. Critically, this is where need is most acute: these organizations fund financial aid, grants, performance seasons, and patient care — and depend on portfolio returns more than ever as government support recedes.</p>`,
        },
      ],
    },
    {
      sections: [
        {
          num: '04',
          label: "What we're building",
          body: `<p>A single, unified agentic system covering every core OCIO workflow — built on existing data and operational infrastructure (e.g. Addepar, Bloomberg, Pitchbook, Arch, Schwab) and an agentic layer for: onboarding, IPS design, spend &amp; cash-flow modeling, portfolio customization, scenario analysis, investment selection and diligence, trade execution and operations, continuous monitoring, tax optimization, compliance, reporting and board updates, and ad-hoc research. Analysts remain in the loop where judgment matters; agents do everything else.</p>`,
          callout: {
            title: 'Why OCIO is the next frontier for AI services',
            body: `<p>OCIO is overwhelmingly <strong>information labor, not judgment labor</strong> — a series of dense processing tasks delivered manually by domain experts. Frontier agents with the right data foundation can replace nearly all of this work: gathering market and manager data, building and stress-testing portfolios, drafting IPS documents, monitoring positions, generating board materials, and answering trustee questions — with full audit trails.</p>
            <p>OCIO is <strong>harder than legal or accounting AI</strong> — more degrees of freedom, fewer clean right answers. That difficulty is the moat. Combined with long-term, trust-based client relationships and high switching costs, the resulting business is more defensible and far stickier than its AI-services peers.</p>`,
          },
        },
        {
          num: '05',
          label: 'Go-to-market & scaling',
          pillars: [
            ['Initial wedge: the underserved segment', `Community foundations, education endowments, and arts/cultural organizations $10M–$250M. <strong>Radically transparent 15–20 bps pricing</strong> — half the market rate — with the fee schedule published on our website.`],
            ["Unit economics that don't exist today", `Traditional OCIO ratio: ~$100M AUM/employee. Reve target: <strong>$1B+ AUM/employee</strong>. Even at half-price, this transforms the margin profile of the industry.`],
            ['Agentic distribution', `AI agents identify prospects, respond to public RFPs at scale, and demonstrate credibility via team and advisory board. Speed and reach unprecedented for OCIO.`],
            ['Strategic acquisitions', `Boutique $2B OCIOs trade at $8–12M (8–12× EBITDA). Acquisition gives instant AUM, track record, and best practices — expanding margins from ~20% to as high as 75% post-integration.`],
            ['Upmarket expansion', `From the underserved wedge into &gt;$250M institutions, hospitals, and pensions; can also expand into family offices, boutique RIAs, and international markets.`],
            ['Software licensing', `License the agentic platform to large endowments, sovereign funds, and pensions that keep investing functions in-house. Multi-million-dollar contracts; defensible against horizontal AI labs via domain depth and proprietary outcome data.`],
          ],
        },
        {
          num: '06',
          label: 'Team',
          body: `<p><a href="https://www.linkedin.com/in/eytan-schindelhaim-b2433357/" target="_blank" rel="noopener">Eytan Schindelhaim</a>, CEO — Head of product at Opto Investments; key product roles at Cadre, Addepar.</p>
          <p><a href="https://www.linkedin.com/in/sreenathare/" target="_blank" rel="noopener">Sreenath Are</a>, CTO — Principal software engineer at PDT Partners, Addepar, Sandbar.</p>`,
        },
      ],
      closing: {
        line: `We're building the investment platform institutions deserve.`,
        contact: `Contact &nbsp;·&nbsp; <strong>eytan@revecio.com</strong> &nbsp;·&nbsp; revecio.com`,
      },
    },
  ],
};

export { DEFAULT_MEMO };
