import {
  computePlanningPath,
  isActionApplicable,
} from "./rules.js";

export const PHASES = Object.freeze(["before", "during", "after"]);
export const PHASE_LABELS = Object.freeze({
  before: "Before the meeting or event",
  during: "During the meeting or event",
  after: "After the meeting or event",
});

function normalizeMarkup(element) {
  return element.outerHTML.replace(/\s+/g, " ").trim();
}

function splitTokens(element, name) {
  return (element.getAttribute(name) || "").split(/\s+/).filter(Boolean);
}

export function parseCanonicalGuide(document) {
  const registry = document.getElementById("source-content-registry");
  if (!registry) throw new Error("The canonical source registry is missing.");

  const variants = [...registry.querySelectorAll(".source-variant")].map(
    (variant) => ({
      sourceAction: variant.dataset.sourceAction,
      section: variant.dataset.sourceSection,
      phase: variant.dataset.phase,
      delivery: variant.dataset.delivery || null,
      needs: variant.dataset.needs || null,
      features: variant.dataset.features || null,
    }),
  );
  if (variants.length === 0) {
    throw new Error("The canonical source registry contains no actions.");
  }

  return {
    title: "Complete accessible meetings and events planning guide",
    variants,
    phases: PHASES.map((phase) => ({
      phase,
      articles: [...document.querySelectorAll(
        `#${phase} .guide-action`,
      )].map((article) => ({
        id: article.id,
        legacyId: article.querySelector(".legacy-fragment")?.id || null,
        title: article.querySelector(":scope > h3")?.innerHTML || "",
        titleText: article.querySelector(":scope > h3")?.textContent.trim() || "",
        sourceActions: splitTokens(article, "data-source-actions"),
        article,
      })),
    })),
  };
}

export async function loadCanonicalGuide() {
  const response = await fetch("./full-guide.html");
  if (!response.ok) {
    throw new Error(`The complete guide could not be loaded (${response.status}).`);
  }
  const source = await response.text();
  const parsed = new DOMParser().parseFromString(source, "text/html");
  return parseCanonicalGuide(parsed);
}

function intersect(first, second) {
  const values = new Set(second);
  return first.some((value) => values.has(value));
}

function filterArticle(article, applicableIds) {
  const clone = article.cloneNode(true);
  const primary = applicableIds[0].sourceAction;
  clone.id = `action-${primary}`;
  clone.dataset.primarySourceAction = primary;
  clone.querySelectorAll(".action-context").forEach((context) => {
    const sourceSections = splitTokens(
      context,
      "data-source-section",
    );
    const applicableSections = new Set(
      applicableIds.map(({ section }) => section),
    );
    if (!sourceSections.some((section) => applicableSections.has(section))) {
      context.remove();
      return;
    }
    context.querySelectorAll(".action-applicability").forEach((note) => {
      if (!applicableIds.some(
        ({ sourceAction }) => sourceAction === note.dataset.sourceAction,
      )) {
        note.remove();
      }
    });
  });
  clone.querySelectorAll(".action-support li[data-source-actions]").forEach(
    (item) => {
      if (!intersect(
        splitTokens(item, "data-source-actions"),
        applicableIds.map(({ sourceAction }) => sourceAction),
      )) {
        item.remove();
      }
    },
  );
  clone.querySelectorAll(".action-support").forEach((support) => {
    if (!support.querySelector("li")) support.remove();
  });
  clone.dataset.sourceActions = applicableIds
    .map(({ sourceAction }) => sourceAction)
    .join(" ");
  clone.querySelectorAll("[data-source-actions]").forEach((node) => {
    const kept = splitTokens(node, "data-source-actions").filter(
      (sourceId) => applicableIds.some(
        ({ sourceAction }) => sourceAction === sourceId,
      ),
    );
    if (kept.length) node.dataset.sourceActions = kept.join(" ");
  });
  clone.querySelectorAll(".legacy-fragment, .source-fragment").forEach(
    (fragment) => fragment.remove(),
  );
  applicableIds.slice(1).forEach(({ sourceAction }) => {
    const fragment = document.createElement("span");
    fragment.className = "source-fragment";
    fragment.id = `action-${sourceAction}`;
    fragment.setAttribute("aria-hidden", "true");
    clone.prepend(fragment);
  });
  return clone;
}

export function buildPersonalizedGuide(canonical, answers) {
  const path = computePlanningPath(answers);
  const applicable = canonical.variants.filter(
    (variant) => isActionApplicable(variant, path),
  );
  const applicableIds = new Set(
    applicable.map(({ sourceAction }) => sourceAction),
  );
  const byPhase = Object.fromEntries(
    PHASES.map((phase) => [phase, []]),
  );

  canonical.phases.forEach(({ phase, articles }) => {
    articles.forEach((record) => {
      const variants = applicable.filter(
        ({ sourceAction }) => record.sourceActions.includes(sourceAction),
      );
      if (!variants.length) return;
      const article = filterArticle(record.article, variants);
      const key = `${phase}:${article.querySelector(":scope > h3").textContent.replace(/\s+/g, " ").trim().toLowerCase()}`;
      const existing = byPhase[phase].find((item) => item.key === key);
      if (existing) {
        const existingSupport = new Set(
          [...existing.article.querySelectorAll(".action-support li")]
            .map(normalizeMarkup),
        );
        article.querySelectorAll(".action-support").forEach((support) => {
          const target = [...existing.article.querySelectorAll(".action-support")]
            .find((candidate) => candidate.querySelector("h4")?.textContent
              === support.querySelector("h4")?.textContent);
          support.querySelectorAll("li").forEach((item) => {
            if (!existingSupport.has(normalizeMarkup(item))) {
              target?.querySelector("ul")?.append(item.cloneNode(true));
            }
          });
        });
        return;
      }
      byPhase[phase].push({ key, article });
    });
  });

  return {
    answers,
    path,
    applicableSourceActions: applicableIds,
    phases: PHASES.map((phase) => ({
      phase,
      articles: byPhase[phase].map(({ article }) => article),
    })),
  };
}

export function renderGuideInto(container, model) {
  container.replaceChildren();
  model.phases.forEach(({ phase, articles }) => {
    if (!articles.length) return;
    const section = document.createElement("section");
    section.className = "planning-phase";
    section.id = phase;
    const heading = document.createElement("h2");
    heading.textContent = PHASE_LABELS[phase];
    section.append(heading);
    const grid = document.createElement("gcds-grid");
    grid.className = "action-grid";
    grid.setAttribute("tag", "div");
    grid.setAttribute("columns", "1fr");
    grid.setAttribute("columns-desktop", "1fr 1fr");
    grid.setAttribute("gap", "400");
    grid.setAttribute("align-items", "start");
    articles.forEach((article) => grid.append(article));
    section.append(grid);
    section.setAttribute("tabindex", "-1");
    articles.forEach((article) => article.setAttribute("tabindex", "-1"));
    const contents = document.createElement("p");
    contents.className = "return-to-contents";
    contents.innerHTML = '<a href="#contents">Return to contents</a>';
    section.append(contents);
    container.append(section);
  });
}
