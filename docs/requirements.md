# Prototype requirements

## Agreed scope

- English-only prototype; eventual Digital Accessibility Toolkit integration is bilingual.
- Preserve original questionnaire wording, applicability rules, action wording, instructions, related links and barriers. Do not add, rewrite or summarize accessibility guidance.
- Provide a complete guide independently of the questionnaire, and a personalized guide based on answers.
- Organize both guides by Before, During and After the meeting or event, using semantic headings (document H1, phase H2, action H3), lists and meaningful links. All guidance and barriers are visible.
- No completion checkboxes or completion tracking. Questionnaire checkboxes remain where appropriate.
- Bookmark and share personalized guides using URL-based answers; allow editing without losing selections. Do not include personal information.
- Apply existing filtering before deduplication. Within each phase combine exactly identical action wording, preserving all distinct guidance, links and barriers. Remove exact duplicate supporting entries; retain differently worded actions. Preserve the unmodified original source and its applicability metadata.
- Provide printing and standalone HTML downloads for both guides. Downloads must be readable and printable offline without JavaScript; outside links may require internet access.
- Native Word and accessible PDF exports are deferred. Do not claim browser-generated PDFs are accessible without testing.

## Implementation approach

Static HTML, CSS and vanilla JavaScript, with no production dependencies or build step. Use relative paths for repository-subpath hosting. The complete guide works without JavaScript and is the canonical content source; the personalized route will derive from that source. Preserve source variants, applicability metadata and support provenance even if the complete view deduplicates displayed content. Use the GC Design System for presentation after checking integration details; native semantics and functionality must not depend on its scripts.

Development is organized in feature branches and reviewed pull requests. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the workflow and [AGENTS.md](../AGENTS.md) for repository instructions. Python dependencies are test-only and documented in [tests/README.md](../tests/README.md). Development fixtures, tests and development-only documentation must be excluded from a future public deployment.

Hosting uses the existing Netlify site. `netlify.toml` prepares a website-only `dist/` allowlist for production and Deploy Previews, with noindex response headers. A removable client-side shared-password gate applies only to prepared deployment copies. It is a casual-access deterrent, not authentication, and must not enter canonical guidance or standalone downloads. The canonical complete guide remains usable without JavaScript. See [hosting.md](hosting.md) for deployment and Netlify secret configuration.

## Interaction and validation

Retain existing question groups and values. Explicitly submit or update answers; no automatic navigation on input changes. Preserve answers when moving back to the questionnaire and support browser history. Restore focus to an appropriate heading or question after navigation as needed. Handle missing, invalid or unsupported URL parameters without silently dropping guidance. Provide a useful complete-guide route if JavaScript or personalized generation fails.

## Open details

- Exact URL parameter schema and versioning.
- Question of how the complete guide should render repeated applicability context without excessive print length.
- Final page controls, print layout, and design-system integration.
- Manual Netlify production/Deploy Preview, VoiceOver and print verification.
- Hosting release and eventual removal of the preview deterrent.

Step 2 preserves the supplied source and applicability rules, and Step 3 refines the complete static guide. The questionnaire, personalized guide, bookmarking and exports are not implemented. Do not publish until content preservation, routing, and accessibility have been tested, including manual assistive-technology and print checks.
