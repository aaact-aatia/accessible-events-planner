import {
  buildPersonalizedGuide,
  loadCanonicalGuide,
  renderGuideInto,
} from "./content.js";
import {
  DELIVERY_LABELS,
  FEATURE_LABELS,
  NEED_LABELS,
  SIZE_LABELS,
  editUrl,
  parseAnswersUrl,
} from "./rules.js";
import { printGuide } from "./export.js";
import { setStatus, showErrors } from "./shared.js";

const title = document.getElementById("guide-title");
const errors = document.getElementById("guide-errors");
const summary = document.getElementById("selection-summary");
const controls = document.getElementById("guide-controls");
const contents = document.getElementById("contents");
const output = document.getElementById("personalized-content");
const status = document.getElementById("guide-status");
const edit = document.getElementById("edit-answers");
const editGcds = document.getElementById("edit-answers-gcds");
const printButton = document.getElementById("print-guide");
const nativePrintButton = document.getElementById("print-guide-native");
let currentAnswers = null;
let renderGeneration = 0;
let currentRoute = null;

function routeKey() {
  return `${location.pathname}${location.search}`;
}

function renderSummary(answers) {
  const features = answers.sessionFeatures.map(
    (value) => FEATURE_LABELS[value],
  );
  const needs = answers.needs.map((value) => NEED_LABELS[value]);
  summary.innerHTML = "";
  const heading = document.createElement("h2");
  heading.textContent = "Your selections";
  const list = document.createElement("ul");
  [
    ["Attendance", DELIVERY_LABELS[answers.deliveryFormat]],
    ["Audience size", SIZE_LABELS[answers.eventType]],
    ["Session features", features.length ? features.join("; ") : "None selected"],
    ["Additional considerations", needs.length ? needs.join("; ") : "None selected"],
  ].forEach(([term, description]) => {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = `${term}: `;
    item.append(strong, description);
    list.append(item);
  });
  summary.append(heading, list);
  summary.hidden = false;
}

function focusCurrentFragment() {
  if (!errors.hidden) return;
  if (!location.hash) {
    title.focus();
    return;
  }
  let target = null;
  try {
    target = document.querySelector(location.hash);
  } catch {
    title.focus();
    return;
  }
  if (target?.classList.contains("source-fragment")) {
    target = target.closest(".guide-action");
  }
  if (!target) {
    title.focus();
    return;
  }
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.scrollIntoView({ block: "start" });
  target.focus({ preventScroll: true });
}

function renderContents(model) {
  const list = contents.querySelector("ul");
  const labels = {
    before: "Before the meeting or event",
    during: "During the meeting or event",
    after: "After the meeting or event",
  };
  list.replaceChildren();
  model.phases.forEach(({ phase, articles }) => {
    if (!articles.length) return;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${phase}`;
    link.textContent = labels[phase];
    item.append(link);
    list.append(item);
  });
  contents.hidden = list.children.length === 0;
}

async function render() {
  const generation = ++renderGeneration;
  const requestedRoute = routeKey();
  currentRoute = requestedRoute;
  setStatus(status, "");
  const parsed = parseAnswersUrl(location.href);
  if (parsed.errors.length) {
    controls.hidden = false;
    printButton.hidden = true;
    nativePrintButton.hidden = true;
    contents.hidden = true;
    summary.hidden = true;
    output.replaceChildren();
    showErrors(
      errors,
      parsed.errors.map((message) => ({ message })),
      "This personalized guide cannot be created from the URL as written:",
    );
    const recovery = new URL("index.html", location.href);
    recovery.search = location.search;
    setEditHref(recovery);
    const fallback = document.createElement("p");
    const link = document.createElement("a");
    link.href = "full-guide.html";
    link.textContent = "Use the complete guide";
    fallback.append(link, " while you review the questionnaire.");
    output.append(fallback);
    return;
  }
  currentAnswers = parsed.answers;
  try {
    setStatus(status, "Loading personalized guide.");
    const canonical = await loadCanonicalGuide();
    if (
      generation !== renderGeneration
      || requestedRoute !== routeKey()
    ) {
      return;
    }
    const model = buildPersonalizedGuide(canonical, currentAnswers);
    if (!model.phases.some(({ articles }) => articles.length)) {
      throw new Error("No applicable actions were found.");
    }
    renderGuideInto(output, model);
    renderContents(model);
    renderSummary(currentAnswers);
    setEditHref(editUrl(location.href, currentAnswers));
    controls.hidden = false;
    showErrors(errors, []);
    document.title = "Personalized accessible meetings and events planning guide";
    setStatus(status, `Personalized guide created with ${model.applicableSourceActions.size} applicable source actions.`);
    printButton.hidden = false;
    nativePrintButton.hidden = false;
    focusCurrentFragment();
  } catch (error) {
    if (
      generation !== renderGeneration
      || requestedRoute !== routeKey()
    ) {
      return;
    }
    setStatus(status, "");
    controls.hidden = false;
    printButton.hidden = true;
    nativePrintButton.hidden = true;
    contents.hidden = true;
    summary.hidden = true;
    output.replaceChildren();
    showErrors(
      errors,
      [{ message: `The personalized guide could not be built. ${error.message}` }],
      "Review the problem, or use the complete guide:",
    );
    const fallback = document.createElement("p");
    const link = document.createElement("a");
    link.href = "full-guide.html";
    link.textContent = "Open the complete guide";
    fallback.append(link);
    output.append(fallback);
    const recovery = new URL("index.html", location.href);
    recovery.search = location.search;
    setEditHref(recovery);
    console.error(error);
  }

  function setEditHref(href) {
    edit.href = href;
    editGcds.href = href;
    editGcds.setAttribute("href", href);
  }
}

nativePrintButton.addEventListener("click", () => printGuide());
printButton.addEventListener("gcdsClick", () => printGuide());

window.addEventListener("popstate", () => {
  if (routeKey() === currentRoute) {
    focusCurrentFragment();
  } else {
    render();
  }
});
window.addEventListener("hashchange", focusCurrentFragment);
render();
