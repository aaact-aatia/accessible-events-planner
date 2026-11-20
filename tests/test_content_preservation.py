from __future__ import annotations

import hashlib
import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/Meetings-Events-Planning-Path_Draft1(2).html"
INVENTORY = ROOT / "tests/fixtures/source-inventory.json"
GUIDE = ROOT / "full-guide.html"
STYLES = ROOT / "css/styles.css"
PRINT_STYLES = ROOT / "css/print.css"


def normalized_markup(node) -> str:
    return re.sub(r"\s+", " ", str(node)).strip()


def canonical_markup(markup: str) -> str:
    return normalized_markup(BeautifulSoup(markup, "html.parser"))


def same_window_markup(markup: str) -> str:
    soup = BeautifulSoup(markup, "html.parser")
    for link in soup.select('a[target="_blank"]'):
        del link["target"]
    for notice in soup.select(".wb-inv"):
        if "opens in a new tab" in notice.get_text(" ", strip=True).lower():
            notice.decompose()
    return normalized_markup(soup)


def same_window_text(markup: str) -> str:
    return BeautifulSoup(same_window_markup(markup), "html.parser").get_text(
        " ", strip=True
    )


class IdCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []

    def handle_starttag(self, tag, attrs) -> None:
        values = dict(attrs)
        if "id" in values:
            self.ids.append(values["id"])


class ContentPreservationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fixture_bytes = FIXTURE.read_bytes()
        cls.fixture = BeautifulSoup(cls.fixture_bytes, "html.parser")
        cls.guide = BeautifulSoup(GUIDE.read_text(encoding="utf-8"), "html.parser")
        cls.inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))

    def test_fixture_is_byte_exact_and_has_expected_checksum(self) -> None:
        self.assertEqual(
            hashlib.sha256(self.fixture_bytes).hexdigest(),
            "7da4b0d6df6c4b98b8b8c70d84c2f209f1fd81d8128141e4b1aa08a15ce3a4b4",
        )

    def test_expected_counts_are_preserved(self) -> None:
        self.assertEqual(self.inventory["counts"]["sections"], 19)
        self.assertEqual(self.inventory["counts"]["sourceActions"], 132)
        self.assertEqual(
            self.inventory["counts"]["uniqueActionTitlesByPhase"],
            117,
        )
        self.assertEqual(
            self.inventory["expectations"]["validAnswerCombinations"],
            73_728,
        )

    def test_all_source_action_ids_are_unique_and_present_once_in_registry(self) -> None:
        source_ids = [
            action["data-source-action"]
            for action in self.fixture.select(
                "#checklists-guidance li[data-source-action]"
            )
        ]
        registry_ids = [
            node["data-source-action"]
            for node in self.guide.select(".source-variant[data-source-action]")
        ]
        self.assertEqual(len(source_ids), 132)
        self.assertEqual(len(set(source_ids)), 132)
        self.assertCountEqual(registry_ids, source_ids)

    def test_action_titles_and_support_are_preserved(self) -> None:
        source_records = {
            action["sourceAction"]: action for action in self.inventory["actions"]
        }
        for record in self.guide.select(".source-variant[data-source-action]"):
            source_id = record["data-source-action"]
            original = source_records[source_id]
            articles = self.guide.select(
                f'.guide-action[data-source-actions~="{source_id}"]'
            )
            self.assertEqual(len(articles), 1, source_id)
            article = articles[0]
            self.assertEqual(
                article.find("h3").get_text(" ", strip=True),
                original["title"],
                source_id,
            )
            self.assertEqual(
                canonical_markup(article.find("h3").decode_contents()),
                canonical_markup(original["titleMarkup"]),
                source_id,
            )
            for title in (
                "How to do this:",
                "Related guidance:",
                "Helps prevent barriers such as:",
            ):
                for entry in original["support"][title]:
                    matches = article.select(
                        f'li[data-source-actions~="{source_id}"]'
                    )
                    matching = [
                        node
                        for node in matches
                        if node.get_text(" ", strip=True)
                        == same_window_text(entry["markup"])
                    ]
                    self.assertTrue(
                        matching,
                        f"{source_id}: {entry['text']}",
                    )
                    copied = BeautifulSoup(str(matching[0]), "html.parser").find("li")
                    del copied["data-source-actions"]
                    self.assertEqual(
                        same_window_markup(str(copied)),
                        same_window_markup(entry["markup"]),
                        f"{source_id}: {entry['text']}",
                    )

    def test_all_support_categories_keep_the_source_entry_counts(self) -> None:
        totals = {
            "How to do this:": 0,
            "Related guidance:": 0,
            "Helps prevent barriers such as:": 0,
        }
        for action in self.inventory["actions"]:
            for title in totals:
                totals[title] += len(action["support"][title])
        self.assertEqual(
            totals,
            {
                "How to do this:": 298,
                "Related guidance:": 213,
                "Helps prevent barriers such as:": 441,
            },
        )

    def test_support_markup_and_links_are_preserved(self) -> None:
        source_links = {
            (
                link.get_text(" ", strip=True).removesuffix(
                    " (opens in a new tab)"
                ),
                link.get("href"),
                tuple(link.get("rel") or []),
            )
            for link in self.fixture.select(
                "#checklists-guidance li[data-source-action] a[href]"
            )
        }
        guide_links = {
            (
                link.get_text(" ", strip=True),
                link.get("href"),
                tuple(link.get("rel") or []),
            )
            for link in self.guide.select(".guide-action a[href]")
        }
        self.assertEqual(guide_links, source_links)
        self.assertFalse(self.guide.select('a[target="_blank"]'))
        self.assertFalse(self.guide.select(".wb-inv"))

    def test_complete_guide_has_required_semantic_structure_without_controls(self) -> None:
        self.assertEqual(len(self.guide.select("h1")), 1)
        self.assertEqual(
            [heading.get_text(" ", strip=True) for heading in self.guide.select(".planning-phase > h2")],
            [
                "Before the meeting or event",
                "During the meeting or event",
                "After the meeting or event",
            ],
        )
        self.assertEqual(len(self.guide.select(".guide-action > h3")), 117)
        self.assertFalse(self.guide.select(".guide-action input[type=checkbox]"))
        self.assertFalse(self.guide.select(".guide-action details"))
        self.assertFalse(
            self.guide.select(
                ".guide-action button, "
                ".guide-action input, "
                ".guide-action select, "
                ".guide-action textarea, "
                ".guide-action [role=button], "
                ".guide-action [role=checkbox]"
            )
        )
        self.assertEqual(len(self.guide.select("main")), 1)
        self.assertIsNotNone(self.guide.select_one('a.skip-link[href="#main-content"]'))
        toc_links = self.guide.select(".guide-contents > ul > li > a")
        self.assertEqual(
            [(link.get_text(" ", strip=True), link["href"]) for link in toc_links],
            [
                ("Before the meeting or event", "#before"),
                ("During the meeting or event", "#during"),
                ("After the meeting or event", "#after"),
            ],
        )
        self.assertEqual(
            len(self.guide.select('nav.guide-contents a[href^="#action-"]')),
            0,
        )
        return_links = self.guide.select(
            ".planning-phase > .return-to-contents > a"
        )
        self.assertEqual(len(return_links), 3)
        self.assertTrue(all(link["href"] == "#contents" for link in return_links))

    def test_action_fragments_are_based_on_stable_source_identifiers(self) -> None:
        for article in self.guide.select(".guide-action"):
            variants = article["data-source-actions"].split()
            primary = article["data-primary-source-action"]
            self.assertIn(primary, variants)
            self.assertEqual(article["id"], f"action-{primary}")
            reordered = list(reversed(variants))
            self.assertEqual(article["id"], f"action-{primary}")
            self.assertEqual(sorted(reordered), sorted(variants))
        ids = {article["id"] for article in self.guide.select(".guide-action")}
        self.assertEqual(len(ids), 117)
        phase_counts = self.inventory["counts"]["byPhase"]
        legacy_targets = [
            target["id"] for target in self.guide.select(".legacy-fragment[id]")
        ]
        expected_legacy = [
            f"action-{phase}-{index:03d}"
            for phase in ("before", "during", "after")
            for index in range(1, phase_counts[phase] + 1)
        ]
        self.assertCountEqual(legacy_targets, expected_legacy)

    def test_no_duplicate_dom_ids_or_in_page_link_targets_are_missing(self) -> None:
        parser = IdCollector()
        parser.feed(GUIDE.read_text(encoding="utf-8"))
        self.assertEqual(len(parser.ids), len(set(parser.ids)))
        ids = set(parser.ids)
        for link in self.guide.select('a[href^="#"]'):
            self.assertIn(link["href"][1:], ids)

    def test_condition_metadata_matches_source(self) -> None:
        conditional = self.guide.select(
            '.source-variant[data-delivery], .source-variant[data-needs], .source-variant[data-features]'
        )
        self.assertEqual(len(conditional), 14)
        for variant in conditional:
            source_id = variant["data-source-action"]
            original = self.fixture.select_one(
                f'li[data-source-action="{source_id}"]'
            )
            for name in ("data-delivery", "data-needs", "data-features"):
                self.assertEqual(variant.get(name), original.get(name), source_id)

    def test_support_entries_include_special_backup_plan_barrier_only_for_source_variant(self) -> None:
        special = "Participants do not know what to do when access issues occur."
        matches = [
            item
            for item in self.guide.select(".guide-action li")
            if item.get_text(" ", strip=True) == special
        ]
        self.assertEqual(len(matches), 1)
        self.assertEqual(
            matches[0]["data-source-actions"],
            "accessibility-supports-checklist-4",
        )

    def test_non_action_content_is_inventoried(self) -> None:
        expected = {
            "in-person-checklist",
            "virtual-checklist",
            "hybrid-checklist",
            "small-meetings",
            "presentations",
            "large-meetings",
            "townhall-events",
            "formal-events",
            "core-checklist",
            "accessibility-contact-checklist",
            "bilingual-checklist",
            "high-risk-checklist",
            "visual-content-checklist",
            "recording-followup-checklist",
            "cultural-considerations-checklist",
            "accessibility-supports-checklist",
            "presenter-coordination-checklist",
            "interaction-checklist",
            "prerecorded-media-checklist",
        }
        self.assertEqual(
            {section["id"] for section in self.inventory["sections"]},
            expected,
        )
        for section in self.inventory["sections"]:
            self.assertTrue(section["title"])
            self.assertTrue(section["notes"])

    def test_applicability_context_is_visible_near_related_actions(self) -> None:
        contexts = self.guide.select("main .action-context")
        self.assertEqual(len(contexts), 132)
        for section in self.inventory["sections"]:
            matches = [
                context
                for context in contexts
                if context["data-source-section"] == section["id"]
            ]
            self.assertTrue(matches, section["id"])
            for context in matches:
                self.assertEqual(
                    context.find("strong").get_text(" ", strip=True),
                    section["title"],
                )
                visible_notes = [
                    note.get_text(" ", strip=True)
                    for note in context.find_all("p", recursive=False)[1:]
                ]
                expected_notes = [
                    BeautifulSoup(note, "html.parser").get_text(" ", strip=True)
                    for note in section["notes"]
                ]
                self.assertEqual(visible_notes, expected_notes)
        records = {
            action["sourceAction"]: action for action in self.inventory["actions"]
        }
        for article in self.guide.select(".guide-action"):
            expected_sections = {
                records[source_id]["section"]
                for source_id in article["data-source-actions"].split()
            }
            actual_sections = {
                context["data-source-section"]
                for context in article.select(".action-context")
            }
            self.assertEqual(actual_sections, expected_sections, article["id"])
        introduction = self.guide.select_one("main .guide-introduction")
        self.assertIn(
            "Not every action applies to every event.",
            introduction.get_text(" ", strip=True),
        )

    def test_item_level_conditions_are_visible_without_broadening_them(self) -> None:
        conditional = [
            action
            for action in self.inventory["actions"]
            if action["delivery"] or action["needs"] or action["features"]
        ]
        self.assertEqual(len(conditional), 14)
        for action in conditional:
            rendered = self.guide.select_one(
                f'.action-applicability[data-source-action="{action["sourceAction"]}"]'
            )
            self.assertIsNotNone(rendered, action["sourceAction"])
            text = rendered.get_text(" ", strip=True)
            if action["delivery"]:
                self.assertIn("Delivery format:", text)
            if action["features"]:
                self.assertIn("Session feature:", text)
            if action["needs"]:
                self.assertIn("Additional consideration:", text)
            condition_types = sum(
                value is not None
                for value in (action["delivery"], action["features"], action["needs"])
            )
            self.assertEqual(
                "All of the following conditions must apply." in text,
                condition_types > 1,
            )

    def test_displayed_support_has_no_unexpected_or_duplicate_entries(self) -> None:
        records = {
            action["sourceAction"]: action for action in self.inventory["actions"]
        }
        for article in self.guide.select(".guide-action"):
            source_ids = article["data-source-actions"].split()
            expected: dict[str, list[str]] = {
                title: []
                for title in (
                    "How to do this",
                    "Related guidance",
                    "Helps prevent barriers such as",
                )
            }
            category_names = {
                "How to do this": "How to do this:",
                "Related guidance": "Related guidance:",
                "Helps prevent barriers such as":
                    "Helps prevent barriers such as:",
            }
            for source_id in source_ids:
                for visible_name, source_name in category_names.items():
                    for entry in records[source_id]["support"][source_name]:
                        markup = same_window_markup(entry["markup"])
                        if markup not in expected[visible_name]:
                            expected[visible_name].append(markup)
            for section in article.select(".action-support"):
                heading = section.find("h4").get_text(" ", strip=True)
                rendered = []
                for item in section.select(":scope > ul > li"):
                    copied = BeautifulSoup(str(item), "html.parser").find("li")
                    del copied["data-source-actions"]
                    rendered.append(same_window_markup(str(copied)))
                self.assertEqual(rendered, expected[heading], article["id"])

    def test_screen_styles_include_reflow_and_forced_colors_support(self) -> None:
        styles = STYLES.read_text(encoding="utf-8")
        self.assertIn("max-width: 75ch", styles)
        self.assertIn("#personalized-content,", styles)
        self.assertIn(".action-grid {", styles)
        self.assertIn("width: 100%;\n  max-width: none;", styles)
        self.assertIn("@media (forced-colors: active)", styles)
        self.assertIn("overflow-wrap: anywhere", styles)
        self.assertIn("outline-color: Highlight", styles)
        self.assertNotIn("position: sticky", styles)
        self.assertNotIn("position: fixed", styles)

    def test_print_styles_hide_chrome_without_forcing_whole_actions_together(
        self,
    ) -> None:
        styles = PRINT_STYLES.read_text(encoding="utf-8")
        self.assertIn(".site-header", styles)
        self.assertIn(".site-footer", styles)
        self.assertIn(".site-footer {\n  margin-block-start", styles)
        self.assertIn("break-after: avoid", styles)
        self.assertIn(".guide-action,\n.action-support {\n  break-inside: auto", styles)
        self.assertNotIn(".guide-action { break-inside: avoid; }", styles)


if __name__ == "__main__":
    unittest.main()
