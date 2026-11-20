from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/Meetings-Events-Planning-Path_Draft1(2).html"


class PrototypeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fixture = BeautifulSoup(
            FIXTURE.read_text(encoding="utf-8"),
            "html.parser",
        )
        cls.questionnaire = BeautifulSoup(
            (ROOT / "index.html").read_text(encoding="utf-8"),
            "html.parser",
        )

    def test_fixture_remains_immutable(self) -> None:
        self.assertEqual(
            hashlib.sha256(FIXTURE.read_bytes()).hexdigest(),
            "7da4b0d6df6c4b98b8b8c70d84c2f209f1fd81d8128141e4b1aa08a15ce3a4b4",
        )

    def test_questionnaire_preserves_original_options_and_values(self) -> None:
        expected = {}
        actual = {}
        for name in ("deliveryFormat", "eventType", "sessionFeatures", "needs"):
            expected[name] = [
                (
                    control["value"],
                    control.find_parent("label").get_text(" ", strip=True),
                )
                for control in self.fixture.select(
                    f'#decision-tree input[name="{name}"]'
                )
            ]
            actual[name] = [
                (
                    control["value"],
                    control.find_parent("label").get_text(" ", strip=True),
                )
                for control in self.questionnaire.select(
                    f'#planning-form input[name="{name}"]'
                )
            ]
        self.assertEqual(actual, expected)
        for name, host_id in (
            ("deliveryFormat", "delivery-format-radios"),
            ("eventType", "event-type-radios"),
        ):
            host = self.questionnaire.select_one(
                f'gcds-radios#{host_id}[name="{name}"]'
            )
            self.assertIsNotNone(host)
            self.assertEqual(host.get("tabindex"), "-1")
            options = json.loads(host["options"])
            self.assertEqual(
                [(option["value"], option["label"]) for option in options],
                expected[name],
            )

    def test_questionnaire_preserves_legend_and_instruction_wording(self) -> None:
        expected_legends = [
            node.get_text(" ", strip=True)
            for node in self.fixture.select("#decision-tree legend")
        ]
        actual_legends = [
            node.get_text(" ", strip=True)
            for node in self.questionnaire.select("#planning-form legend")
        ]
        self.assertEqual(actual_legends, expected_legends)
        self.assertEqual(
            self.questionnaire.select_one("#wizard-instructions").get_text(
                " ", strip=True
            ),
            self.fixture.select_one("#wizard-instructions").get_text(
                " ", strip=True
            ),
        )
        self.assertEqual(
            self.questionnaire.select_one("#q2-heading").get_text(" ", strip=True),
            self.fixture.select_one("#q2-heading").get_text(" ", strip=True),
        )

    def test_select_all_exposes_native_mixed_state(self) -> None:
        questionnaire = (ROOT / "js/questionnaire.js").read_text(encoding="utf-8")
        self.assertIn(
            "nativeSelectAll.indeterminate = selected > 0",
            questionnaire,
        )
        self.assertIn(
            'selectAll.value = selected === total ? ["all"] : []',
            questionnaire,
        )
        self.assertIn(
            "checkboxHostsReady && fieldsetHostsReady",
            questionnaire,
        )
        self.assertIn("const nativeSelectAll", questionnaire)
        self.assertIn('host.value = [...(answers[host.name] || [])]', questionnaire)
        self.assertIn("syncNativeCheckboxes(host)", questionnaire)
        self.assertIn(
            'document.activeElement.closest?.(\n    ".native-questionnaire-control-fallback",\n  )',
            questionnaire,
        )
        self.assertIn("refreshActiveErrors();", questionnaire)
        self.assertIn("restoreFormAnswers(form, readFormAnswers(form));", questionnaire)
        self.assertIn(
            'fieldsetHostsReady = true;\n'
            '  document.documentElement.classList.add("gcds-fieldsets-ready");\n'
            "  updateSelectAll();",
            questionnaire,
        )
        self.assertIn("location.search !== lastSearch", questionnaire)
        self.assertIn("lastSearch = location.search", questionnaire)
        self.assertNotIn('role="alert"', (ROOT / "index.html").read_text())

    def test_questionnaire_has_native_required_groups_and_error_summary(self) -> None:
        self.assertEqual(
            len(self.questionnaire.select('input[name="deliveryFormat"][required]')),
            3,
        )
        self.assertEqual(
            len(self.questionnaire.select('input[name="eventType"][required]')),
            3,
        )
        self.assertIsNotNone(
            self.questionnaire.select_one(
                '#questionnaire-errors[tabindex="-1"]'
            )
        )
        for name, error_id in (
            ("deliveryFormat", "delivery-error"),
            ("eventType", "size-error"),
        ):
            controls = self.questionnaire.select(f'input[name="{name}"]')
            self.assertEqual(len(controls), 3)
            self.assertIsNotNone(self.questionnaire.select_one(f"#{error_id}"))
        self.assertIsNotNone(
            self.questionnaire.select_one(
                '#planning-form[aria-describedby="wizard-instructions"]'
            )
        )

    def test_entry_pages_have_navigation_and_skip_link(self) -> None:
        for name in ("index.html", "guide.html", "full-guide.html"):
            page = BeautifulSoup(
                (ROOT / name).read_text(encoding="utf-8"),
                "html.parser",
            )
            self.assertIsNotNone(
                page.select_one('a.skip-link[href="#main-content"]'),
                name,
            )
            self.assertIsNotNone(page.select_one("main#main-content"), name)
            self.assertIsNotNone(
                page.select_one(
                    'gcds-header[skip-to-href="#main-content"]'
                ),
                name,
            )
            self.assertFalse(page.select(".guide-action input"), name)

    def test_personalized_page_has_expected_progressive_enhancement_fallback(self) -> None:
        page = BeautifulSoup(
            (ROOT / "guide.html").read_text(encoding="utf-8"),
            "html.parser",
        )
        self.assertIsNotNone(
            page.select_one(
                'main > .complete-guide-recovery a[href="full-guide.html"]'
            )
        )
        self.assertIsNotNone(page.select_one("#guide-errors[tabindex='-1']"))
        self.assertIsNotNone(page.select_one("#guide-status[role=status]"))
        self.assertIsNotNone(page.select_one("#edit-answers"))
        self.assertIsNotNone(
            page.select_one(
                'gcds-button#edit-answers-gcds[type="link"]'
                '[href="index.html"]'
            )
        )
        self.assertIsNone(page.select_one("#download-guide"))
        self.assertIsNotNone(page.select_one("#print-guide"))
        self.assertEqual(
            page.select_one("#print-guide").get_text(" ", strip=True),
            "Print checklist",
        )
        guide_script = (ROOT / "js/guide.js").read_text(encoding="utf-8")
        self.assertIn("function renderContents(model)", guide_script)
        self.assertIn("if (!articles.length) return;", guide_script)
        self.assertIn("contents.hidden = list.children.length === 0;", guide_script)
        self.assertIsNotNone(
            self.questionnaire.select_one(
                '.no-js-only a[href="full-guide.html"]'
            )
        )
        self.assertIn("questionnaire-js-only", self.questionnaire.form["class"])

    def test_hidden_attribute_remains_hidden_despite_component_display_rules(self) -> None:
        styles = (ROOT / "css/styles.css").read_text(encoding="utf-8")
        self.assertIn("[hidden] {", styles)
        self.assertIn("display: none !important;", styles)

    def test_complete_guide_print_controls_are_hidden_until_javascript_runs(self) -> None:
        page = BeautifulSoup(
            (ROOT / "full-guide.html").read_text(encoding="utf-8"),
            "html.parser",
        )
        self.assertIsNotNone(
            page.select_one("#complete-guide-controls[hidden]")
        )
        self.assertIsNone(page.select_one("#download-complete-guide"))
        self.assertEqual(
            page.select_one("#print-complete-guide").get_text(" ", strip=True),
            "Print checklist",
        )
        self.assertIsNotNone(
            page.select_one('script[type="module"][src="js/full-guide.js"]')
        )
        self.assertNotIn("preview-gate", (ROOT / "full-guide.html").read_text())

    def test_application_excludes_hosting_gate_dependencies(self) -> None:
        for name in (
            "js/questionnaire.js",
            "js/guide.js",
            "js/content.js",
            "js/export.js",
            "js/full-guide.js",
        ):
            self.assertNotIn(
                "preview-gate-config",
                (ROOT / name).read_text(encoding="utf-8"),
                name,
            )
        export = (ROOT / "js/export.js").read_text(encoding="utf-8")
        self.assertEqual(
            export.strip(),
            "export function printGuide() {\n  window.print();\n}",
        )
        guide = (ROOT / "js/guide.js").read_text(encoding="utf-8")
        self.assertIn("const requestedRoute = routeKey();", guide)
        self.assertIn("if (routeKey() === currentRoute)", guide)
        self.assertNotIn("requestedUrl !== location.href", guide)

    def test_gc_design_system_assets_and_desktop_grids_are_progressively_enhanced(self) -> None:
        expected_component_url = (
            "https://cdn.design-system.canada.ca/"
            "@gcds-core/components@1.7.0/dist/gcds/"
        )
        for page_name in ("index.html", "guide.html", "full-guide.html"):
            page = BeautifulSoup(
                (ROOT / page_name).read_text(encoding="utf-8"),
                "html.parser",
            )
            self.assertIsNotNone(page.select_one("gcds-container[layout=page]"))
            self.assertIsNotNone(
                page.select_one(f'link[href^="{expected_component_url}"]')
            )
            self.assertIsNotNone(
                page.select_one(f'script[src^="{expected_component_url}"]')
            )
            self.assertIsNotNone(
                page.select_one(
                    'gcds-header.gcds-shell[skip-to-href="#main-content"]'
                )
            )
            notice = page.select_one("gcds-notice")
            self.assertIsNotNone(notice)
            self.assertLess(
                page.find_all().index(page.select_one("main h1")),
                page.find_all().index(notice),
            )
            self.assertIsNotNone(notice.find_parent("main"))
            self.assertIsNotNone(
                page.select_one(
                    ".native-notice-fallback h2"
                )
            )
            self.assertIsNone(page.select_one(".no-export"))
            self.assertIsNotNone(page.select_one("gcds-footer.gcds-shell"))
            self.assertEqual(len(page.select("gcds-header.gcds-shell")), 1)
            self.assertEqual(len(page.select("gcds-footer.gcds-shell")), 1)
            self.assertIsNotNone(
                page.select_one(
                    ".native-shell-fallback"
                )
            )
            self.assertIsNone(page.select_one('nav[aria-label="Prototype pages"]'))
            page_meta = page.select_one(".page-meta")
            self.assertIsNotNone(page_meta)
            values = page_meta.select("gcds-date-modified")
            self.assertEqual(len(values), 2)
            self.assertEqual(values[0].get_text(" ", strip=True), "2026-11-19")
            self.assertEqual(values[1].get("type"), "version")
            self.assertEqual(values[1].get_text(" ", strip=True), "v0.9.0")
        full_guide = BeautifulSoup(
            (ROOT / "full-guide.html").read_text(encoding="utf-8"),
            "html.parser",
        )
        grids = full_guide.select(
            "gcds-grid.action-grid[columns='1fr']"
            "[columns-desktop='1fr 1fr']"
        )
        self.assertEqual(len(grids), 3)
        self.assertEqual(len(full_guide.select(".action-grid > .guide-action")), 117)
        questionnaire_list = self.questionnaire.select_one(
            "ul#needs-options.choice-list.needs-grid"
        )
        self.assertIsNotNone(questionnaire_list)
        self.assertEqual(len(questionnaire_list.select(":scope > li")), 10)
        gcds_features = self.questionnaire.select_one(
            'gcds-checkboxes#session-features-checkboxes[name="sessionFeatures"]'
        )
        gcds_needs = self.questionnaire.select_one(
            'gcds-checkboxes#needs-checkboxes[name="needs"]'
        )
        self.assertIsNotNone(gcds_features)
        self.assertIsNotNone(gcds_needs)
        self.assertIsNone(
            self.questionnaire.select_one(
                ".native-checkbox-fallback gcds-checkboxes"
            )
        )
        self.assertFalse(
            any(
                fieldset.find_parent("fieldset")
                for fieldset in self.questionnaire.select(
                    ".native-checkbox-fallback"
                )
                if fieldset.name == "fieldset"
            )
        )
        self.assertEqual(
            self.questionnaire.select_one("#select-all-needs")["name"],
            "selectAllNeeds",
        )
        select_all_options = json.loads(
            self.questionnaire.select_one("#select-all-needs")["options"]
        )
        self.assertEqual(select_all_options, [{
            "id": "select-all-needs-control",
            "label": "Select all considerations below",
            "value": "all",
        }])
        self.assertEqual(
            self.questionnaire.select_one("#select-all-needs-native")[
                "aria-controls"
            ],
            "needs-options",
        )
        self.assertEqual(len(json.loads(gcds_features["options"])), 3)
        self.assertEqual(len(json.loads(gcds_needs["options"])), 10)
        self.assertIsNotNone(
            self.questionnaire.select_one(
                "body.questionnaire-page #planning-form"
            )
        )
        fieldsets = self.questionnaire.select("gcds-fieldset")
        self.assertEqual(len(fieldsets), 3)
        self.assertEqual(
            [fieldset["legend-size"] for fieldset in fieldsets],
            ["h6", "h6", "h6"],
        )
        self.assertIsNotNone(
            fieldsets[1].select_one(
                "gcds-checkboxes#session-features-checkboxes"
            )
        )
        self.assertIsNotNone(
            fieldsets[2].select_one("gcds-checkboxes#needs-checkboxes")
        )
        delivery = fieldsets[0].select_one("gcds-radios#delivery-format-radios")
        self.assertIsNotNone(delivery)
        self.assertTrue(delivery.has_attr("hide-legend"))
        self.assertEqual(delivery["legend"], "Attendance format")
        self.assertEqual(
            fieldsets[0]["legend"],
            "1. How will participants attend? (required)",
        )
        styles = (ROOT / "css/styles.css").read_text(encoding="utf-8")
        self.assertIn(".action-grid:not(:defined)", styles)
        self.assertIn(".questionnaire-page main > *,", styles)
        self.assertIn(".questionnaire-page #planning-form", styles)
        self.assertIn(".questionnaire-page main > p,", styles)
        self.assertIn(".questionnaire-page #wizard-instructions,", styles)
        self.assertIn(".questionnaire-page .choice-list label,", styles)
        self.assertIn(
            ".question-group {\n  margin-block: 1.5rem;\n  padding: 1rem 0;\n"
            "  border: 0;\n}",
            styles,
        )
        self.assertIn(
            ".question-group fieldset {\n  margin-block: 1rem;\n"
            "  padding: 0;\n  border: 0;",
            styles,
        )
        self.assertIn(
            '--gcds-fieldset-legend-size-h6-desktop: '
            '700 1.25rem/160% "Noto Sans", sans-serif;',
            styles,
        )
        self.assertIn("font-size: 1.25rem;", styles)
        self.assertIn(".gcds-shell-ready .native-shell-fallback", styles)
        self.assertIn("@media screen {\n  .gcds-shell-ready .gcds-shell,", styles)
        self.assertIn(".gcds-shell-visible .gcds-shell", styles)
        self.assertIn(".gcds-controls-ready .gcds-control-enhancement", styles)
        self.assertIn(".gcds-errors-ready .gcds-error-enhancement", styles)
        self.assertIn(
            ".gcds-fieldsets-ready .gcds-fieldset-enhancement",
            styles,
        )
        self.assertIn(
            ".gcds-fieldsets-ready .native-fieldset-fallback",
            styles,
        )
        shell = (ROOT / "js/shell.js").read_text(encoding="utf-8")
        self.assertIn("waitForNativeFocusToLeave", shell)
        self.assertIn(
            'waitForNativeFocusToLeave(".native-shell-fallback")',
            shell,
        )
        self.assertIn(
            'waitForNativeFocusToLeave(".native-control-fallback")',
            shell,
        )
        self.assertIn("@media screen and (min-width: 64em)", styles)
        self.assertIn("grid-template-columns: repeat(2, minmax(0, 1fr))", styles)
        self.assertLess(
            styles.index("@media (forced-colors: active)"),
            styles.index("  grid-template-columns: repeat(2"),
            "fallback desktop grid must not be nested in forced colors"
        )
        print_styles = (ROOT / "css/print.css").read_text(encoding="utf-8")
        self.assertIn(".action-grid:not(:defined),", print_styles)
        self.assertIn(
            ".action-grid:not(:defined),\n.needs-grid,\nul.needs-grid {\n"
            "  display: block;",
            print_styles,
        )
        self.assertIn(".gcds-shell", print_styles)
        self.assertIn(".gcds-radio-enhancement", print_styles)
        self.assertIn(".native-radio-fallback", print_styles)
        navigation = (ROOT / "js/navigation.js").read_text(encoding="utf-8")
        self.assertIn('window.addEventListener("beforeprint"', navigation)
        self.assertIn('grid.setAttribute("columns-desktop", "1fr")', navigation)

    def test_validation_focus_states_are_managed(self) -> None:
        questionnaire = (ROOT / "js/questionnaire.js").read_text(encoding="utf-8")
        self.assertIn('setGroupError("deliveryFormat", "delivery-error"', questionnaire)
        self.assertIn('setGroupError("eventType", "size-error"', questionnaire)
        self.assertIn("if (errors.hidden && gcdsSummary.hidden) return;", questionnaire)
        self.assertIn(
            "target: fieldsetHostsReady ? \"event-type-radios\" : \"size-small\"",
            questionnaire,
        )
        self.assertIn(
            "target: radioHostsReady && fieldsetHostsReady",
            questionnaire,
        )
        self.assertIn(
            "if (radioHostsReady && fieldsetHostsReady)",
            questionnaire,
        )
        self.assertIn('if (errorSummarySource !== "validation") return;', questionnaire)
        self.assertIn('errorSummarySource = "url";', questionnaire)
        full_guide = (ROOT / "js/full-guide.js").read_text(encoding="utf-8")
        self.assertIn('window.addEventListener("load", focusFragment', full_guide)
        self.assertIn('window.addEventListener("hashchange", focusFragment)', full_guide)

    def test_source_fragments_are_not_hard_coded_to_inapplicable_variants(self) -> None:
        content = (ROOT / "js/content.js").read_text(encoding="utf-8")
        self.assertIn("const primary = applicableIds[0].sourceAction", content)
        self.assertIn("clone.id = `action-${primary}`", content)
        self.assertIn("clone.dataset.sourceActions = applicableIds", content)
        self.assertIn("applicableIds.slice(1)", content)
        guide = (ROOT / "js/guide.js").read_text(encoding="utf-8")
        self.assertIn(
            'target?.classList.contains("source-fragment")',
            guide,
        )
        self.assertIn('heading.setAttribute("tabindex", "-1")', guide)
        self.assertIn(
            'target.querySelector("h1, h2, h3, h4, h5, h6")',
            guide,
        )
        self.assertIn('target.scrollIntoView({ block: "start" })', guide)
        self.assertIn('heading.focus({ preventScroll: true })', guide)
        self.assertNotIn('target.setAttribute("tabindex", "-1")', guide)
        self.assertNotIn('target.focus({ preventScroll: true })', guide)
        self.assertIn("if (!errors.hidden) return;", guide)


if __name__ == "__main__":
    unittest.main()
