# Repository instructions

## Project overview

This repository contains the English-language Accessible Events Planner prototype, intended for eventual integration into the Digital Accessibility Toolkit. Accessibility, content accuracy and maintainability are core requirements.

## Required project documentation

Before significant work, read:

- [README.md](README.md)
- [docs/requirements.md](docs/requirements.md)
- [docs/content-maintenance.md](docs/content-maintenance.md)
- [docs/source-content-inventory.md](docs/source-content-inventory.md)
- [tests/README.md](tests/README.md)

## Architecture

- Use semantic HTML, CSS and vanilla JavaScript.
- Keep production dependency-free apart from approved presentation assets.
- Do not introduce frameworks, static site generators or production build processes without approval.
- Use relative paths suitable for repository-subpath hosting and eventual Eleventy/Government of Canada Design System integration.
- Preserve future bilingual compatibility; do not hard-code architectural assumptions that require English only.

## Content preservation

- Treat [full-guide.html](full-guide.html) as the canonical guidance source.
- Keep the original HTML regression fixture byte-for-byte unchanged.
- Do not rewrite, summarize, translate or correct existing guidance without content-owner approval.
- Preserve meaningful markup, links, barriers, source identifiers, applicability metadata and provenance.
- Use the extraction script only for one-time migration or read-only auditing. Never use its overwrite option during routine maintenance.
- Report suspected editorial errors separately.

## Applicability and deduplication

- Preserve questionnaire values and applicability rules.
- Filter source variants before exact deduplication.
- Deduplicate only exact matches within the same planning phase.
- Retain all distinct applicable supporting content.
- Do not use semantic similarity or generated rewriting.
- Test inclusion of applicable content and exclusion of inapplicable content.

## Accessibility

- Prefer native HTML and controls; use ARIA only when necessary.
- Preserve heading hierarchy, reading order, keyboard operation and visible focus.
- Support 400% reflow, forced-colors mode, meaningful links and progressive enhancement.
- Keep the complete guide usable without JavaScript and keep all guidance visible.
- Preserve stable fragment identifiers.
- Preserve meaningful structure in print and offline output.
- Distinguish automated tests and browser automation from manual assistive-technology testing. Never infer accessibility conformance from automated checks alone.

## Workflow

- Keep approved tasks focused and use descriptive feature branches.
- Make focused commits without emojis.
- Run `npm test` before review and do not weaken tests to make implementations pass.
- Open pull requests for independent review; do not merge automatically.
- Document functionality and known limitations.
- Do not configure public hosting without approval.
- Propose separate issues for unrelated defects.

## Review priorities

Prioritize actionable findings involving accessibility, altered or missing guidance, applicability, provenance, bookmarkable links, progressive enhancement, print/export behavior, privacy/security and missing regression coverage. Avoid subjective style feedback unless it affects accessibility, maintainability or project conventions. Include impact, affected code and a practical recommendation.
