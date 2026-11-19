# Personalized guide URL parameters

## Version 1 schema

Personalized guides use query parameters on `guide.html`. The schema is versioned so future changes can remain explicit.

```text
guide.html?v=1&delivery=hybrid&size=large&features=training,formal&needs=visual,recording
```

The supported parameters are:

- `v=1`: required schema version.
- `delivery`: required `inPerson`, `virtual`, or `hybrid`.
- `size`: required `small`, `large`, or `townhall`.
- `features`: optional comma-separated `training`, `formal`, and `organizationWide` values.
- `needs`: optional comma-separated `risk`, `languages`, `supports`, `presenters`, `visual`, `prerecorded`, `interaction`, `recording`, `followup`, and `cultural` values.

List values are emitted in the questionnaire’s established order. The URL contains event-planning options only and must not contain names, contact details or other personal information.

## Validation

Unknown parameter names, unsupported versions, repeated singular parameters, duplicate list values, empty list values and unsupported values produce a visible, focused error summary. They are not silently removed.

Valid known selections are restored on the questionnaire editing page where possible. If the guide cannot be generated, the page provides an independent route to the complete guide.

## Editing and history

Submitting the questionnaire navigates to a canonical `guide.html` URL. The personalized guide’s Edit answers link returns to `index.html` with the same parameters. Browser Back and Forward use normal document history; route changes do not create duplicate history entries.

Fragments remain independent from questionnaire parameters so direct links such as `#action-visual-content-checklist-1` remain usable and do not change guide applicability.
