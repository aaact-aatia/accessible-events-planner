[![Netlify Status](https://api.netlify.com/api/v1/badges/8001de39-e8e2-4247-a9a5-b8a058850ceb/deploy-status)](https://app.netlify.com/projects/aaacteventplanner/deploys)

# accessible-events-planner

A web-based tool for generating personalized, accessible meeting and event planning guides based on questionnaire responses.

**Status:** English-only development prototype. Not ready for publication.

**Prototype version:** v0.9.0

## Development

The prototype uses native HTML, CSS and vanilla JavaScript. No build step, framework, database or account is required. Serve the repository root through a local static HTTP server (for example, VS Code Live Server or `python3 -m http.server 8000` if Python is installed). Open the local server's index page. Use HTTP rather than opening files directly when testing the future guide fetch logic.

## Structure

- `index.html`: questionnaire entry page.
- `guide.html`: personalized guide page.
- `full-guide.html`: complete static guide and planned canonical HTML content source.
- `css/`: shared screen and print styles.
- `js/`: questionnaire, applicability rules, guide rendering and export modules.
- `docs/requirements.md`: agreed scope and implementation requirements.
- `docs/content-maintenance.md`: canonical-content maintenance workflow.
- `docs/source-content-inventory.md`: preservation inventory and review notes.
- `docs/url-parameters.md`: versioned personalized-guide URL schema.
- `tests/README.md`: test setup and verification plan.
- [CONTRIBUTING.md](CONTRIBUTING.md): feature-branch, test, pull-request and review workflow.
- [AGENTS.md](AGENTS.md): instructions for automated coding assistants and contributors.

The prototype now includes the original questionnaire, a personalized guide generated from the canonical static guide, versioned bookmarkable URLs, editing and browser history, printing, and standalone HTML downloads. The complete guide remains readable without JavaScript.

Content authors should follow [the canonical guide maintenance instructions](docs/content-maintenance.md). The extraction script is a one-time migration and audit tool, not an ongoing content generator.

The pages load pinned GC Design System 1.7.0 presentation assets from the official CDN. The prototype uses GCDS header, footer, container, grid, fieldset, radio, checkbox, button, error-summary, notice and date-modified components. Essential controls and content retain native HTML and project CSS fallbacks; each enhanced component family activates only after its GCDS hosts are ready. The complete guide and downloaded HTML do not depend on custom-element JavaScript.

## Hosting

Prototype hosting uses the existing Netlify site. A deployment-preparation script copies only approved website files into `dist/` and applies a removable shared-password deterrent to those deployed copies. Production and Deploy Previews receive noindex headers.

The preview gate is not secure authentication and is not part of the canonical guide or future downloaded documents. See [docs/hosting.md](docs/hosting.md) for architecture, Netlify environment-variable setup and verification instructions.

For local hosting preparation, copy `.env.example` to `.env`, replace the example with a local-only password, and run `npm run prepare:local`. The local script uses Node.js 22's native `--env-file` support; no dotenv package is used. Netlify continues to use `npm run prepare:deploy`.

## Publication

The repository is private. Do not enable GitHub Pages or create another hosting site. Development fixtures, tests and development-only documentation are excluded from `dist/` and must remain excluded from public deployment. Eventual integration into the Digital Accessibility Toolkit must support both official languages. No licence has been selected.

See [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. Repository contributors must install the documented test-only dependencies and run the automated suite before requesting review.
