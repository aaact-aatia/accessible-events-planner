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

Static HTML, CSS and vanilla JavaScript, with no production dependencies or build step. Use relative paths for repository-subpath hosting. The complete guide works without JavaScript and is the canonical content source; the personalized route derives from that source. Preserve source variants, applicability metadata and support provenance even if the complete view deduplicates displayed content. Use pinned GC Design System 1.7.0 assets for presentation where compatible; native semantics and functionality must not depend on its scripts. The prototype uses the header, footer, container, grid, fieldset, radio, checkbox, button, error summary, notice and date-modified components. GCDS fieldsets group the multi-control questionnaire sections; radio and checkbox components retain their distinct inner legends. Component families switch from native fallbacks only after their own GCDS hosts are ready, including when the CDN fails or hydrates partially. Container and responsive grid components retain native CSS fallbacks and print single-column rules.

Development is organized in feature branches and reviewed pull requests. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the workflow and [AGENTS.md](../AGENTS.md) for repository instructions. Python dependencies are test-only and documented in [tests/README.md](../tests/README.md). Development fixtures, tests and development-only documentation must be excluded from a future public deployment.

Hosting uses the existing Netlify site. `netlify.toml` prepares a website-only `dist/` allowlist for production and Deploy Previews, with noindex response headers. A removable client-side shared-password gate applies only to prepared deployment copies. It is a casual-access deterrent, not authentication, and must not enter canonical guidance or standalone downloads. The canonical complete guide remains usable without JavaScript. See [hosting.md](hosting.md) for deployment and Netlify secret configuration.

## Interaction and validation

Retain existing question groups and values. Explicitly submit or update answers; no automatic navigation on input changes. Preserve answers when moving back to the questionnaire and support browser history. Restore focus to an appropriate heading or question after navigation as needed. Handle missing, invalid or unsupported URL parameters without silently dropping guidance. Provide a useful complete-guide route if JavaScript or personalized generation fails.

## Open details

- Version 1 URL schema is documented in [url-parameters.md](url-parameters.md). Preserve compatibility if later versions are introduced.
- Question of how the complete guide should render repeated applicability context without excessive print length.
- Manual Netlify production/Deploy Preview, VoiceOver and print verification.
- Hosting release and eventual removal of the preview deterrent.

The supplied source and applicability rules are preserved. The prototype includes the questionnaire, complete and personalized guides, versioned bookmarkable URLs, answer editing, printing, and standalone HTML downloads. Do not claim accessibility conformance without the documented manual assistive-technology and print checks.
