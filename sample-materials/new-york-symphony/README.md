# Sample onboarding materials — The New York Symphony

Fictitious documents for demoing the client-onboarding flow with a made-up
arts & culture client, **The New York Symphony** (a 1921 orchestra). Drag the
PDFs into the demo's "upload materials" step to onboard a new client.

| File | What it is |
|---|---|
| `NY-Symphony-IPS-2021.pdf` | Prior Investment Policy Statement — deliberately dated/simple (traditional 60/30/10 allocation, vague spending, no liquidity framework) so onboarding visibly adds value |
| `NY-Symphony-Mission-Overview.pdf` | Mission, vision, programs, leadership, the endowment's role |
| `NY-Symphony-Board-Minutes-Mar-2025.pdf` | Board minutes — finances, an OCIO-evaluation motion, the Centennial Campaign |
| `NY-Symphony-Audited-Financials-FY2024.pdf` | Balance sheet, statement of activities, endowment/NYPMIFA note |
| `NY-Symphony-Annual-Report-FY2024.pdf` | Leadership letter, season highlights, financial summary, donor recognition |

The figures are internally consistent across documents (endowment ~$186M,
~$48M operating budget, 5.0% spending policy, $237M net assets that tie out),
and intentionally distinct from the Dream University sample client (smaller
arts org, higher spend, traditional prior IPS).

The `.html` files are the sources. To regenerate a PDF after editing:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=NAME.pdf "file://$PWD/NAME.html"
```
