# Tests

## Prerequisites

- Python 3.10 or later.
- Node.js 22 or later.
- BeautifulSoup 4.13.4 as a test-only dependency. BeautifulSoup and the Python environment are not used in the production prototype.

Create and activate a virtual environment, install the pinned test dependency, and run the suite:

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r tests/requirements.txt
npm test
```

The source fixture is preserved byte-for-byte. Current automated checks:

- Compare 19 source sections, 132 source action IDs, wording, supporting text, markup and links against the supplied HTML.
- Verify 117 unique action titles after same-phase deduplication.
- Exercise all 73,728 valid routing combinations against independently listed section maps and routing rules.
- Verify both inclusion of applicable source variants and exclusion of inapplicable variants.
- Verify filtering uses source-variant provenance before deduplication, including the additional backup-plan barrier.
- Check the complete guide’s static heading structure, internal links, duplicate IDs and absence of completion controls.
- Inventory page introductions, questionnaire content, checklist introductions and applicability notes outside individual actions.

The extraction script was a one-time migration and source-audit helper. After migration, [full-guide.html](../full-guide.html) and the inventories are canonical checked-in files; maintain content directly in those files rather than rerunning generation as part of normal work.

Running the script without an override audits the immutable fixture and writes nothing:

```sh
python3 tests/extract_content.py
```

An explicit `--overwrite-generated-files` option can repeat the initial migration, but it replaces the canonical guide and inventories. Use it only after a separately approved migration reset and review the entire diff. Future guidance edits must not be made only in the original fixture or the script.

Content authors should follow [the content maintenance guide](../docs/content-maintenance.md).

Feature tests for personalized URLs, editing, printing, downloads and browser accessibility remain part of later development stages. Automated checks and source-code review are not substitutes for manual accessibility testing and do not establish accessibility conformance.

## Netlify deployment tests

The deployment tests supply `AEP_PREVIEW_PASSWORD=unit-test-preview-password-not-a-real-secret` only inside the test process. GitHub Actions and contributors do not need the actual Netlify preview password.

The tests verify:

- Missing and empty passwords fail deployment preparation.
- `dist/` contains exactly the website allowlist.
- All deployed pages receive the accessible gate while canonical pages remain gate-free.
- The password is absent from generated output.
- The generated verifier matches the dedicated test password.
- Deployed pages preserve session-storage, inert/ARIA-hidden and URL behavior.
- Netlify noindex and Content Security Policy configuration covers the current assets and the approved GCDS CDN origin.

For a local deployment preparation check, copy the committed example and use a disposable password in the ignored `.env` file:

```sh
cp .env.example .env
# Replace the example value in .env with a local test password.
npm run prepare:local
```

The local command uses Node.js 22's native `--env-file` support. It does not install or use `dotenv`. Tests continue to call `prepare:deploy` with their own dummy value, so they never load `.env`. Never use or paste the actual Netlify preview password in terminal history, issues, pull requests, chat or repository files.

## Development-session browser validation

During Step 3, the development environment’s browser automation was used for one-time validation of:

- A 320 CSS-pixel viewport without horizontal page overflow.
- The skip link becoming visible when focused.
- Contents, return-to-contents and direct action fragment navigation.
- Print-media visibility and page-break behavior.
- Forced-colors media support.

These were ad hoc rendered-browser checks in the development session, not part of `npm test`. Re-run the equivalent checks in a browser after future changes. They were not manual screen-reader or browser testing with a human participant.

## Manual VoiceOver checks on macOS

Run these checks in Safari on macOS after starting a local server:

1. From the repository root, run `python3 -m http.server 8000`.
2. Open `http://localhost:8000/full-guide.html` in Safari.
3. Turn on VoiceOver with Command-F5. On a Touch Bar MacBook, use Touch ID three times quickly if VoiceOver is not assigned to Command-F5.
4. Press Control-Option-U to open the VoiceOver rotor. Confirm that the links list contains the skip link, three contents links and relevant guidance links.
5. In the rotor, move to headings and confirm one document heading, a concise Contents heading, the three planning-phase headings, then action headings and support headings in reading order.
6. Press Tab and Shift-Tab from the top of the page. Confirm that focus is visible, the skip link is usable, contents links activate, and return-to-contents links move back to the contents.
7. Use Command-F to search for the beginning of a known action title. Confirm Safari Find locates the visible action and its heading without requiring disclosure controls.
8. Navigate to a copied direct action URL and confirm VoiceOver announces the action context when reading from the fragment target.
9. Zoom through Safari's View menu or Command-plus until 400%. Confirm text reflows, controls remain visible, and there is no horizontal scrolling at the equivalent 320 CSS-pixel viewport.
10. Open File > Print and inspect the preview. Confirm website navigation is absent, contents remain readable, headings stay with following content, and long actions are not forced into large blank areas.
11. Turn off VoiceOver with Command-F5 and record any differences between keyboard, visual, and screen-reader navigation.

If VoiceOver is unavailable, test with another supported screen reader and record that limitation. Do not report unperformed checks as completed.

For a deployed preview, additionally verify the locked dialog, error announcements, Leave this preview link, Sign out control, hidden/inert underlying content, same-tab session persistence, 400% reflow and print hiding.
