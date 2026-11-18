#!/usr/bin/env python3
"""One-time source migration and audit helper.

The checked-in guide is canonical after migration. This script does not write
repository outputs unless the explicit overwrite flag is provided.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import OrderedDict
from html import escape
from pathlib import Path

from bs4 import BeautifulSoup, Tag


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FIXTURE = ROOT / "tests/fixtures/Meetings-Events-Planning-Path_Draft1(2).html"
PHASES = ("before", "during", "after")
PHASE_TITLES = {
    "before": "Before the meeting or event",
    "during": "During the meeting or event",
    "after": "After the meeting or event",
}
SUPPORT_TITLES = (
    "How to do this:",
    "Related guidance:",
    "Helps prevent barriers such as:",
)


def normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalized_markup(tag: Tag) -> str:
    return normalized(str(tag))


def label_markup(action: Tag) -> str:
    label = action.find("label", recursive=True)
    if label is None:
        raise ValueError(f"Action {action.get('data-source-action')} has no label")
    label = BeautifulSoup(str(label), "html.parser").find("label")
    assert label is not None
    for control in label.select("input[type=checkbox]"):
        control.decompose()
    return "".join(str(child) for child in label.contents).strip()


def attributes_markup(source_id: str, action: Tag, section: Tag) -> str:
    attributes = [
        f'<span class="source-variant" data-source-action="{escape(source_id, quote=True)}"',
        f' data-source-section="{escape(section["id"], quote=True)}"',
        f' data-phase="{escape(action["_phase"], quote=True)}"',
    ]
    for name in ("data-delivery", "data-needs", "data-features"):
        if action.has_attr(name):
            attributes.append(f' {name}="{escape(action[name], quote=True)}"')
    attributes.append("></span>")
    return "".join(attributes)


def support_entries(action: Tag) -> dict[str, list[dict[str, str]]]:
    result = {title: [] for title in SUPPORT_TITLES}
    details = action.find("details", class_="checklist-details")
    if details is None:
        raise ValueError(f"Action {action.get('data-source-action')} has no guidance")
    for paragraph in details.find_all("p", recursive=False):
        title = paragraph.get_text(" ", strip=True)
        if title not in result:
            continue
        entries = paragraph.find_next_sibling("ul")
        if entries is None:
            raise ValueError(f"Action {action['data-source-action']} has no list for {title}")
        for item in entries.find_all("li", recursive=False):
            result[title].append(
                {
                    "markup": normalized_markup(item),
                    "text": item.get_text(" ", strip=True),
                }
            )
    return result


def parse_source(path: Path) -> tuple[BeautifulSoup, list[Tag], list[dict]]:
    source = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    registry = source.select_one("#checklists-guidance")
    if registry is None:
        raise ValueError("Source has no #checklists-guidance registry")

    actions: list[Tag] = []
    for action in registry.select("ul.checkbox-list > li[data-source-action]"):
        phase_heading = action.find_previous("h5")
        if phase_heading is None:
            raise ValueError(f"Action {action['data-source-action']} has no phase")
        phase = phase_heading.get_text(" ", strip=True).lower()
        if phase not in PHASES:
            raise ValueError(f"Action {action['data-source-action']} has invalid phase {phase}")
        action["_phase"] = phase
        action["_section"] = action.find_parent("section", id=True)["id"]
        action["_label_markup"] = label_markup(action)
        action["_support"] = support_entries(action)
        actions.append(action)

    sections = []
    for section in registry.select("section[id]"):
        action_nodes = section.select("ul.checkbox-list > li[data-source-action]")
        if not action_nodes:
            continue
        title = section.find("h4", recursive=False)
        if title is None:
            raise ValueError(f"Section {section['id']} has no title")
        notes = [
            normalized_markup(note)
            for note in section.find_all("p", recursive=False)
        ]
        sections.append(
            {
                "id": section["id"],
                "title": title.get_text(" ", strip=True),
                "notes": notes,
                "actionIds": [node["data-source-action"] for node in action_nodes],
            }
        )
    return source, actions, sections


def build_records(actions: list[Tag]) -> dict[str, list[dict]]:
    by_phase: dict[str, OrderedDict[tuple[str, str], dict]] = {
        phase: OrderedDict() for phase in PHASES
    }
    for action in actions:
        source_id = action["data-source-action"]
        key = (action["_phase"], normalized(action["_label_markup"]))
        record = by_phase[action["_phase"]].setdefault(
            key,
            {
                "phase": action["_phase"],
                "titleMarkup": action["_label_markup"],
                "title": action.find("label").get_text(" ", strip=True),
                "variants": [],
                "support": {title: [] for title in SUPPORT_TITLES},
            },
        )
        record["variants"].append(action)
        for title, entries in action["_support"].items():
            for entry in entries:
                existing = next(
                    (
                        candidate
                        for candidate in record["support"][title]
                        if candidate["markup"] == entry["markup"]
                    ),
                    None,
                )
                if existing:
                    existing["sourceActions"].append(source_id)
                else:
                    record["support"][title].append(
                        {
                            "markup": entry["markup"],
                            "text": entry["text"],
                            "sourceActions": [source_id],
                        }
                    )
    return {phase: list(records.values()) for phase, records in by_phase.items()}


def source_registry(sections: list[dict], actions: list[Tag]) -> str:
    section_markup = []
    for section in sections:
        notes = "".join(
            f'<div class="source-checklist-note">{note}</div>' for note in section["notes"]
        )
        section_markup.append(
            '<div class="source-checklist" '
            f'data-source-section="{escape(section["id"], quote=True)}" '
            f'data-source-title="{escape(section["title"], quote=True)}">'
            f"{notes}</div>"
        )
    variants = [
        attributes_markup(action["data-source-action"], action, action.find_parent("section", id=True))
        for action in actions
    ]
    return "".join(section_markup + variants)


def render_guide(source: BeautifulSoup, actions: list[Tag], sections: list[dict]) -> str:
    grouped = build_records(actions)
    sections_by_id = {section["id"]: section for section in sections}
    toc = "\n".join(
        f'        <li><a href="#{phase}">{PHASE_TITLES[phase]}</a></li>'
        for phase in PHASES
    )
    phase_markup = []
    for phase in PHASES:
        articles = []
        for index, record in enumerate(grouped[phase], start=1):
            variants = [action["data-source-action"] for action in record["variants"]]
            variant_list = " ".join(variants)
            primary_source_action = variants[0]
            action_id = f"action-{primary_source_action}"
            legacy_id = f"action-{phase}-{index:03d}"
            articles.append(
                f'''      <article class="guide-action" id="{action_id}" data-primary-source-action="{primary_source_action}" data-source-actions="{variant_list}">
        <span class="legacy-fragment" id="{legacy_id}" aria-hidden="true"></span>
        <h3>{record["titleMarkup"]}</h3>
{render_action_context(record, sections_by_id)}
{render_support(record["support"])}
      </article>'''
            )
        article_markup = "\n".join(articles)
        phase_markup.append(
            f'''  <section id="{phase}" class="planning-phase">
    <h2>{PHASE_TITLES[phase]}</h2>
{article_markup}
    <p class="return-to-contents"><a href="#contents">Return to contents</a></p>
  </section>'''
        )

    title = source.title.get_text(" ", strip=True) if source.title else "Accessible meetings and events planning guide"
    description = source.find("meta", attrs={"name": "description"})
    description_content = (
        description["content"]
        if description is not None and description.get("content")
        else "Complete accessibility planning guide for meetings and events."
    )
    page_introduction = source.select_one("#main-content > .page-container > section")
    audience_introduction = ""
    detailed_guidance = ""
    if page_introduction:
        for paragraph in page_introduction.find_all("p", recursive=False):
            text = paragraph.get_text(" ", strip=True)
            if text.startswith("This tool is for organizers"):
                audience_introduction = normalized_markup(paragraph)
            elif text.startswith("See the "):
                detailed_guidance = normalized_markup(paragraph)
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{escape(description_content, quote=True)}">
  <title>Complete accessible meetings and events planning guide</title>
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/print.css" media="print">
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header">
    <p class="project-name">{escape(title)}</p>
    <nav aria-label="Prototype pages">
      <ul>
        <li><a href="index.html">Questionnaire</a></li>
        <li><a href="guide.html">Personalized guide</a></li>
        <li><a href="full-guide.html" aria-current="page">Complete guide</a></li>
      </ul>
    </nav>
  </header>
  <main id="main-content" tabindex="-1">
    <h1>Accessible meetings and events planning guide</h1>
    <div class="guide-introduction">
      <p>This complete guide contains actions for different meeting and event delivery formats, audience sizes, session features, and accessibility considerations. Use the actions that apply to your meeting or event. Not every action applies to every event.</p>
      {audience_introduction}
      {detailed_guidance}
    </div>
    <nav class="guide-contents" id="contents" aria-labelledby="contents-heading">
      <h2 id="contents-heading">Contents</h2>
      <ul>
{toc}
      </ul>
    </nav>
{chr(10).join(phase_markup)}
  </main>
  <div id="source-content-registry" hidden>
{source_registry(sections, actions)}
  </div>
  <footer class="site-footer">
    <p>Development prototype. Not ready for publication.</p>
  </footer>
</body>
</html>
'''


def render_action_context(record: dict, sections_by_id: dict[str, dict]) -> str:
    section_ids = list(
        dict.fromkeys(action["_section"] for action in record["variants"])
    )
    contexts = []
    for section_id in section_ids:
        section = sections_by_id[section_id]
        notes = "\n".join(f"          {note}" for note in section["notes"])
        conditions = []
        for action in record["variants"]:
            if action["_section"] != section_id:
                continue
            condition_parts = render_applicability_conditions(action)
            if condition_parts:
                conditions.append(
                    f'''          <div class="action-applicability" data-source-action="{escape(action["data-source-action"], quote=True)}">
            <p><strong>Action applicability</strong></p>
            <ul>
{"".join(f"              <li>{part}</li>{chr(10)}" for part in condition_parts)}            </ul>
          </div>'''
                )
        condition_markup = "\n".join(conditions)
        contexts.append(
            f'''        <div class="action-context" data-source-section="{escape(section_id, quote=True)}">
          <p><strong>{escape(section["title"])}</strong></p>
{notes}
{condition_markup}
        </div>'''
        )
    return "\n".join(contexts)


def render_applicability_conditions(action: Tag) -> list[str]:
    delivery_labels = {
        "inPerson": "In-person only",
        "virtual": "Virtual only",
        "hybrid": "Hybrid",
    }
    feature_labels = {
        "training": "Training, workshop, or presentation",
        "formal": "Public, formal, technical, legal, or high-profile event",
        "organizationWide": "Town hall or organization-wide session",
    }
    need_labels = {
        "risk": "High-risk content",
        "languages": "Bilingual or spoken-language interpretation",
        "supports": "Accessibility supports",
        "presenters": "Multiple presenters",
        "visual": "Visual content",
        "prerecorded": "Pre-recorded content",
        "interaction": "Interaction",
        "recording": "Recording the session",
        "followup": "Sharing follow-up materials",
        "cultural": "Indigenous, cultural, or community considerations",
    }
    parts = []
    for attribute, label, values in (
        ("data-delivery", "Delivery format", delivery_labels),
        ("data-features", "Session feature", feature_labels),
        ("data-needs", "Additional consideration", need_labels),
    ):
        if action.has_attr(attribute):
            labels = [values[value] for value in action[attribute].split()]
            parts.append(f"{label}: {' or '.join(labels)}.")
    if len(parts) > 1:
        parts.insert(0, "All of the following conditions must apply.")
    return parts


def render_support(support: dict[str, list[dict]]) -> str:
    blocks = []
    for title in SUPPORT_TITLES:
        entries = support[title]
        if not entries:
            continue
        label = title[:-1]
        rendered_items = []
        for entry in entries:
            source_actions = " ".join(entry["sourceActions"])
            item = entry["markup"].replace(
                "<li",
                f'<li data-source-actions="{source_actions}"',
                1,
            )
            rendered_items.append(f"            {item}")
        items = "\n".join(rendered_items)
        blocks.append(
            f'''        <section class="action-support">
          <h4>{label}</h4>
          <ul>
{items}
          </ul>
        </section>'''
        )
    return "\n".join(blocks)


def inventory_data(path: Path, source: BeautifulSoup, actions: list[Tag], sections: list[dict]) -> dict:
    grouped = build_records(actions)
    decision_tree = source.select_one("#decision-tree")
    question_instructions = decision_tree.select_one("#wizard-instructions") if decision_tree else None
    reference_intro = []
    registry = source.select_one("#checklists-guidance")
    if registry:
        for child in registry.find_all(recursive=False):
            if child.name == "section" and child.get("id"):
                break
            if child.name in ("h2", "h3", "p", "nav"):
                reference_intro.append(
                    {"element": child.name, "markup": normalized_markup(child), "text": child.get_text(" ", strip=True)}
                )
        category_nodes = [
            node
            for node in registry.find_all(["h3", "p"], recursive=False)
            if node.name == "h3" or (node.name == "p" and node.get("class") is None)
        ]
        for node in category_nodes:
            if node.name == "h3" and node.get("id") == "full-checklists":
                continue

    controls = []
    for control in source.select("#wizard-form input[name]"):
        controls.append(
            {
                "name": control.get("name"),
                "value": control.get("value"),
                "type": control.get("type"),
                "required": control.has_attr("required"),
                "label": control.find_parent("label").get_text(" ", strip=True)
                if control.find_parent("label")
                else None,
            }
        )

    action_records = []
    for action in actions:
        action_records.append(
            {
                "sourceAction": action["data-source-action"],
                "section": action["_section"],
                "phase": action["_phase"],
                "title": action.find("label").get_text(" ", strip=True),
                "titleMarkup": action["_label_markup"],
                "delivery": action.get("data-delivery"),
                "needs": action.get("data-needs"),
                "features": action.get("data-features"),
                "support": action["_support"],
            }
        )

    bytes_value = path.read_bytes()
    page_intro = source.select_one("#main-content > .page-container > section")
    return {
        "source": {
            "fileName": path.name,
            "sha256": hashlib.sha256(bytes_value).hexdigest(),
            "bytes": len(bytes_value),
        },
        "expectations": {
            "sections": 19,
            "sourceActions": 132,
            "uniqueActionTitlesByPhase": 117,
            "validAnswerCombinations": 73_728,
        },
        "counts": {
            "sections": len(sections),
            "sourceActions": len(actions),
            "uniqueActionTitlesByPhase": sum(len(grouped[phase]) for phase in PHASES),
            "byPhase": {phase: len(grouped[phase]) for phase in PHASES},
        },
        "pageIntroduction": [
            normalized_markup(node)
            for node in page_intro.find_all(["h1", "p"], recursive=False)
        ] if page_intro else [],
        "questionnaireInstructions": question_instructions.get_text(" ", strip=True)
        if question_instructions
        else None,
        "questionnaireControls": controls,
        "referenceIntroduction": reference_intro,
        "sections": sections,
        "actions": action_records,
    }


def render_inventory_markdown(inventory: dict) -> str:
    lines = [
        "# Source content inventory",
        "",
        "## Scope",
        "",
        "This document inventories meaningful content in the original supplied HTML. The preserved fixture is the source of truth for exact content and formatting.",
        "",
        "## Regression expectations",
        "",
        f"- Checklist sections: **{inventory['expectations']['sections']}**",
        f"- Unique source action identifiers: **{inventory['expectations']['sourceActions']}**",
        f"- Unique action titles within planning phases: **{inventory['expectations']['uniqueActionTitlesByPhase']}**",
        f"- Valid questionnaire answer combinations: **{inventory['expectations']['validAnswerCombinations']:,}**",
        f"- Source SHA-256: `{inventory['source']['sha256']}`",
        "",
        "## Meaningful content outside actions",
        "",
        "The original page introduction, questionnaire instructions and controls, reference introduction, checklist titles, and applicability notes are retained in this inventory. Meaningful complete-guide introductions and applicability notes are also displayed to users; questionnaire-only interface copy remains documented for later implementation.",
        "",
        "### Page introduction",
        "",
    ]
    for markup in inventory["pageIntroduction"]:
        text = BeautifulSoup(markup, "html.parser").get_text(" ", strip=True)
        lines.append(f"- {text}")

    lines.extend(
        [
            "",
            "### Questionnaire instructions",
            "",
            f"- {inventory['questionnaireInstructions']}",
            "",
            "This wording remains in the source fixture for the questionnaire migration. The typo **“quesion”** is recorded as a suspected editorial error and has not been corrected.",
            "",
            "### Reference and checklist notes",
            "",
            "The reference introduction and the following checklist titles and applicability notes are retained as source metadata. Checklist titles and notes are displayed near their related actions without recreating the original category hierarchy in the heading outline. Questionnaire-specific and obsolete checklist instructions remain here for review.",
            "",
        ]
    )
    for section in inventory["sections"]:
        lines.append(f"#### {section['title']}")
        lines.append("")
        for note in section["notes"]:
            lines.append(f"- {BeautifulSoup(note, 'html.parser').get_text(' ', strip=True)}")
        lines.append("")

    lines.extend(
        [
            "## Proposed interface exclusions and content decisions for review",
            "",
            "- Exclude source completion checkboxes, checklist labels, disclosure controls, stale-state messages and task-tracking wording from generated guides.",
            "- Display checklist-specific applicability introductions and guidance notes near the related actions without recreating the original category hierarchy in the heading structure.",
            "- Review the new complete-guide introduction with the content owner. It explains that actions serve different contexts and not every action applies to every event.",
            "- Replace interface instructions about expanding guidance, assigning responsibilities and completion tracking when those interfaces are implemented.",
            "- Preserve the source’s JavaScript-disabled, print-only and no-JavaScript fallback copy only as interface history unless a future page needs equivalent instructions.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    parser.add_argument(
        "--overwrite-generated-files",
        action="store_true",
        help="Explicitly replace full-guide.html and generated inventories.",
    )
    args = parser.parse_args()
    fixture = args.fixture.resolve()
    source, actions, sections = parse_source(fixture)
    inventory = inventory_data(fixture, source, actions, sections)

    if args.overwrite_generated_files:
        (ROOT / "full-guide.html").write_text(
            render_guide(source, actions, sections), encoding="utf-8"
        )
        (ROOT / "tests/fixtures/source-inventory.json").write_text(
            json.dumps(inventory, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        (ROOT / "docs/source-content-inventory.md").write_text(
            render_inventory_markdown(inventory), encoding="utf-8"
        )
        print("Migration outputs replaced.")
        return

    print(
        "Source audit complete: "
        f"{len(sections)} sections, {len(actions)} source actions, "
        f"{inventory['counts']['uniqueActionTitlesByPhase']} unique actions by phase. "
        "No files were written. Use --overwrite-generated-files only for an approved "
        "one-time migration refresh."
    )


if __name__ == "__main__":
    main()
