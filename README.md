# accessible-events-planner

A web-based tool for generating personalized, accessible meeting and event planning guides based on questionnaire responses.

**Status:** English-only development prototype. Not ready for publication.

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
- `tests/README.md`: test setup and verification plan.
- [CONTRIBUTING.md](CONTRIBUTING.md): feature-branch, test, pull-request and review workflow.
- [AGENTS.md](AGENTS.md): instructions for automated coding assistants and contributors.

The initial scaffold and Step 2 content extraction are complete. Step 3 refines the complete static guide with stable navigation, visible applicability context and readable screen/print presentation. The questionnaire and personalized guide generation remain future development stages.

Content authors should follow [the canonical guide maintenance instructions](docs/content-maintenance.md). The extraction script is a one-time migration and audit tool, not an ongoing content generator.

## Publication

The repository is private. Do not enable GitHub Pages or publish the prototype until authorized. Development fixtures, tests and development-only documentation must be excluded from any eventual public deployment. Eventual integration into the Digital Accessibility Toolkit must support both official languages. No licence has been selected.

See [CONTRIBUTING.md](CONTRIBUTING.md) before making changes. Repository contributors must install the documented test-only dependencies and run the automated suite before requesting review.
