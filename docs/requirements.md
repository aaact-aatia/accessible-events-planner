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

Initial scaffold: static HTML, CSS and vanilla JavaScript, with no production dependencies or build step. Use relative paths for repository-subpath hosting. The complete guide should work without JavaScript; the personalized route will use the complete guide as its content source. Preserve source variants and applicability metadata even if the complete view deduplicates displayed content; decide the exact representation during extraction. Use the GC Design System for presentation after checking integration details; native semantics and functionality must not depend on its scripts.

## Interaction and validation

Retain existing question groups and values. Explicitly submit or update answers; no automatic navigation on input changes. Preserve answers when moving back to the questionnaire and support browser history. Restore focus to an appropriate heading or question after navigation as needed. Handle missing, invalid or unsupported URL parameters without silently dropping guidance. Provide a useful complete-guide route if JavaScript or personalized generation fails.

## Open details

- Exact URL parameter schema and versioning.
- Source extraction and duplicate representation.
- Final page controls, print layout, and design-system integration.
- Hosting and release approval.

The scaffold is not a working planner. Do not publish until content preservation, routing, and accessibility have been tested.
