from __future__ import annotations

import hashlib
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
        self.assertIn("selectAll.indeterminate = selected > 0", questionnaire)
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
            self.assertIsNotNone(page.select_one("nav"), name)
            self.assertFalse(page.select(".guide-action input"), name)

    def test_personalized_page_has_expected_progressive_enhancement_fallback(self) -> None:
        page = BeautifulSoup(
            (ROOT / "guide.html").read_text(encoding="utf-8"),
            "html.parser",
        )
        self.assertIsNotNone(
            page.select_one('noscript a[href="full-guide.html"]')
        )
        self.assertIsNotNone(page.select_one("#guide-errors[tabindex='-1']"))
        self.assertIsNotNone(page.select_one("#guide-status[role=status]"))
        self.assertIsNotNone(page.select_one("#edit-answers"))
        self.assertIsNotNone(page.select_one("#download-guide"))
        self.assertIsNotNone(page.select_one("#print-guide"))
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

    def test_complete_guide_download_controls_are_hidden_until_javascript_runs(self) -> None:
        page = BeautifulSoup(
            (ROOT / "full-guide.html").read_text(encoding="utf-8"),
            "html.parser",
        )
        self.assertIsNotNone(
            page.select_one("#complete-guide-controls[hidden]")
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
        self.assertIn("const snapshot = source.cloneNode(true);", export)
        self.assertIn('role=\\"status\\"', export)
        self.assertIn("script, noscript", export)
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
                    '[data-personalized-guide-link][hidden] '
                    'a[href="guide.html"]'
                )
            )
            self.assertIsNotNone(
                page.select_one(
                    'a[href="https://design-system.canada.ca/en/"]'
                )
            )
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
        styles = (ROOT / "css/styles.css").read_text(encoding="utf-8")
        self.assertIn(".action-grid:not(:defined)", styles)
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
            ".action-grid:not(:defined),\n.needs-grid {\n"
            "  display: block;",
            print_styles,
        )
        navigation = (ROOT / "js/navigation.js").read_text(encoding="utf-8")
        self.assertIn('window.addEventListener("beforeprint"', navigation)
        self.assertIn('grid.setAttribute("columns-desktop", "1fr")', navigation)

    def test_validation_and_download_focus_states_are_managed(self) -> None:
        questionnaire = (ROOT / "js/questionnaire.js").read_text(encoding="utf-8")
        self.assertIn('setGroupError("deliveryFormat", "delivery-error"', questionnaire)
        self.assertIn('setGroupError("eventType", "size-error"', questionnaire)
        self.assertIn('if (!errors.hidden)', questionnaire)
        for script_name in ("js/guide.js", "js/full-guide.js"):
            script = (ROOT / script_name).read_text(encoding="utf-8")
            self.assertIn('aria-disabled", "true"', script)
            self.assertNotIn("downloadButton.focus()", script)
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
        self.assertIn('target.setAttribute("tabindex", "-1")', guide)
        self.assertIn('target.scrollIntoView({ block: "start" })', guide)
        self.assertIn('target.focus({ preventScroll: true })', guide)
        self.assertIn("if (!errors.hidden) return;", guide)


if __name__ == "__main__":
    unittest.main()
