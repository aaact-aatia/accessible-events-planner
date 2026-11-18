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
- `tests/README.md`: test plan.

The initial files are scaffolding only. The existing source guidance and questionnaire will be migrated in later steps.

## Publication

The repository is private. Do not enable GitHub Pages or publish the prototype until authorized. Eventual integration into the Digital Accessibility Toolkit must support both official languages. No licence has been selected.
