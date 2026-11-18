# Netlify prototype hosting

## Purpose and limitations

The prototype deploys from the private `aaact-aatia/accessible-events-planner` repository to the existing Netlify site at [aaacteventplanner.netlify.app](https://aaacteventplanner.netlify.app/). Do not create another site.

The shared password gate is a removable casual-access deterrent for a prototype with no protected information. It is not secure authentication. A person can bypass client-side JavaScript, inspect the deployed verifier, or open the canonical guide with JavaScript disabled. Do not use this gate for confidential material.

The repository must remain private. Production and Deploy Preview responses receive noindex headers, but headers and password deterrence are not a confidentiality control.

## What Netlify publishes

Netlify runs:

```sh
npm run prepare:deploy
```

The command recreates `dist/` and copies an explicit allowlist containing only:

- `index.html`, `guide.html`, and `full-guide.html`
- Required application CSS and JavaScript
- Preview-gate CSS and JavaScript
- Generated preview-gate configuration

Tests, source fixtures, documentation, repository instructions, package/configuration files and GitHub workflows do not enter `dist/`. The gate is injected only into prepared deployment copies. Canonical source pages and future standalone downloads do not inherit the gate.

## Set the shared preview password in Netlify

Do not commit, log or share the password in chat.

1. Sign in to Netlify and open the existing **aaacteventplanner** project.
2. Open **Project configuration**, then **Environment variables**.
3. Add a variable named `AEP_PREVIEW_PASSWORD`.
4. Enter the shared prototype password in the value field. Mark it as sensitive if that option is available.
5. Make the variable available to all deploy scopes needed by the project, specifically:
   - Production
   - Deploy Previews
6. If the Netlify interface requires separate values by deploy context, add the same variable for both Production and Deploy Previews.
7. Save the variable.
8. Trigger a new production deployment after the hosting pull request is merged, and create or refresh a Deploy Preview to verify preview access.

The variable must be present and non-empty. Deployment preparation fails with a clear error if `AEP_PREVIEW_PASSWORD` is missing, including for a preview build. GitHub Actions uses its own dummy test password internally and never needs the real Netlify password.

After changing the password, redeploy. New pages use the new verifier, and previously unlocked sessions must enter the password again after reload.

## Preview-gate behavior

The deployed gate:

- Uses a native modal `dialog` and labelled password form.
- Announces empty and incorrect-password errors.
- Makes underlying content inert, hidden from assistive technology, and unavailable to keyboard interaction while locked.
- Preserves the page path, query string and fragment without redirects or history changes.
- Provides a labelled “Leave this preview” link to the Digital Accessibility Toolkit while the dialog is locked.
- Stores only an unlocked marker in `sessionStorage`.
- Provides a “Sign out of this preview tab” control after entry.
- Keeps the application and canonical guide independent from the gate.
- Omits gate controls from print output.

Native modal behavior contains focus while the dialog is open. The leave link remains keyboard- and screen-reader-accessible, so Escape is prevented without making the interaction inescapable.

## Headers and approved presentation assets

`netlify.toml` applies noindex headers to every deployed path. It also permits only self-hosted scripts, styles and data, plus the approved Government of Canada Design System CDN host for future presentation integration. If new approved GCDS asset origins are introduced, review and update the CSP explicitly. Do not add broad wildcard origins or `unsafe-inline`.

## Verification

For each production or Deploy Preview deployment:

1. Confirm the response includes `X-Robots-Tag: noindex, nofollow, noarchive`.
2. Confirm the deployed HTML is gated, including a direct URL with a query string and fragment.
3. Test empty and incorrect passwords with keyboard and screen-reader feedback.
4. Enter with the shared password, reload, and confirm session entry persists in the same tab.
5. Use Sign out, confirm the page locks again, and confirm the underlying content is unavailable to keyboard and assistive technology while locked.
6. Use Leave this preview from the locked dialog.
7. Confirm canonical source `full-guide.html` remains usable locally without JavaScript and does not contain gate markup.
8. Confirm no fixtures, tests, documentation, repository configuration or password enter the deployed responses.
9. Test 400% zoom, forced-colors mode, printing and VoiceOver according to [tests/README.md](../tests/README.md).

Netlify deployment itself does not establish accessibility conformance. Record automated, browser-automation and manual assistive-technology results separately.
