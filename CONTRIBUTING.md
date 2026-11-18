# Contributing

Read [AGENTS.md](AGENTS.md) and the project documentation before significant changes.

## Branches and scope

- Create a descriptive feature branch from `main`.
- Keep unrelated fixes in separate issues and pull requests.
- Do not configure public hosting or deployment as part of feature work.
- Do not commit source or generated guidance from the immutable regression fixture through routine development.

## Setup and tests

The production prototype has no package or build dependencies. Test setup requires Python 3.10 or later, Node.js 18 or later and the pinned Python dependency in [tests/requirements.txt](tests/requirements.txt).

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r tests/requirements.txt
npm test
```

Run `git diff --check` as well. Add focused regression tests for changed behavior, preserving the 132-action fixture and its applicability metadata.

## Content and accessibility

[full-guide.html](full-guide.html) is the canonical guidance source. Do not rewrite or correct existing guidance without content-owner approval. Preserve source identifiers, provenance, inline markup, links and barriers. Filter before exact deduplication.

Automated tests and browser automation do not establish accessibility conformance. Document browser checks separately from manual keyboard, screen-reader, zoom, forced-colors and print testing.

## Pull requests

- Keep implementation and unrelated infrastructure changes in separate, focused commits.
- Use clear commit messages without emojis.
- Describe content preservation, accessibility considerations, automated tests, browser checks and outstanding manual testing.
- Request independent review and respond to findings with focused commits.
- Do not merge the pull request automatically.

See [tests/README.md](tests/README.md) for detailed testing instructions and [docs/content-maintenance.md](docs/content-maintenance.md) for canonical-content maintenance.
