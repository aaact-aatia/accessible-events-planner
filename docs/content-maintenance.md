# Maintaining guide content

## Canonical sources

Use [full-guide.html](../full-guide.html) as the canonical guide for future prototype content changes. The personalized guide must derive applicable content from its source variants rather than introducing another copy of the guidance.

Keep the original HTML in [tests/fixtures/](../tests/fixtures/) unchanged. It is an immutable regression fixture for the supplied prototype, not an editable source for later releases.

The extraction script in [tests/extract_content.py](../tests/extract_content.py) completed the initial migration. It is not an ongoing production generator. A normal run audits the fixture without writing files. The explicit `--overwrite-generated-files` option can repeat the original extraction, but it must not be used for routine maintenance because it can replace later canonical-guide edits.

## Content-change workflow

1. Confirm that a substantive wording or guidance change is approved. Do not correct or rewrite preserved accessibility guidance only for style, unless the content owner approves the change.
2. Locate the affected displayed action in [full-guide.html](../full-guide.html) by its `data-source-actions` value and review every listed source variant.
3. Update the displayed action and supporting content once, preserving meaningful inline semantics, link text, destinations and new-tab disclosures.
4. Update the variant provenance and any generated source inventory entries when applicability or a source-specific support entry changes. Do not remove a source identifier.
5. Keep each action’s `id` based on its first `data-source-actions` identifier. Do not renumber action fragments when inserting, removing or reordering actions.
6. Run `npm test` and review the test output for content, routing, applicability, navigation and deduplication regressions.
7. If a change affects meaningful section introductions or applicability notes, review [the source content inventory](source-content-inventory.md) and determine how the information will remain user-facing.
8. Record suspected editorial errors or unresolved wording decisions separately. Do not silently incorporate unapproved corrections.

## Adding or changing applicability

Question labels, internal values and approved routing rules must remain synchronized across the canonical content, questionnaire and [rules.js](../js/rules.js). A source variant may retain:

- `data-delivery` for delivery-format matching.
- `data-needs` for consideration matching.
- `data-features` for session-feature matching.

Tokens within one attribute use any-of matching. Supplied attributes use all-of matching across attributes. Filtering must always occur before exact deduplication.

Update the regression tests whenever applicability changes. Add a positive test showing applicable content remains and a negative test showing the same content is excluded when the relevant source variant does not apply.

## Test environment

The prototype has no production JavaScript or Python package dependencies. Python 3.10 or later, Node.js 22 or later and BeautifulSoup 4.13.4 are required only for extraction auditing and automated tests. See [tests/README.md](../tests/README.md) for virtual-environment and installation commands.

## Verification boundaries

Automated tests verify source preservation, routing, semantic structure and known regression cases. Source-code review identifies implementation risks. Neither replaces manual accessibility testing with keyboard navigation, representative screen readers, 400% zoom, forced-colors mode, browser reflow and printed output. Do not claim accessibility conformance from automated checks or source review alone.

## Deployment

Do not deploy the development fixture, test scripts, generated inventories, test requirements or development-only reports. No hosting or public deployment configuration is included at this stage. The repository remains a private development prototype.
