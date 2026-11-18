# Tests

## Prerequisites

- Python 3.10 or later.
- Node.js 18 or later.
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
