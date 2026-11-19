import {
  editUrl,
  guideUrl,
  parseAnswersUrl,
} from "./rules.js";
import {
  readFormAnswers,
  restoreFormAnswers,
  setStatus,
  showErrors,
} from "./shared.js";

const form = document.getElementById("planning-form");
const errors = document.getElementById("questionnaire-errors");
const status = document.getElementById("questionnaire-status");
const selectAll = document.getElementById("select-all-needs");
let lastSearch = null;
let changeStatusAnnounced = false;

document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

function updateSelectAll() {
  const needs = [...form.querySelectorAll('input[name="needs"]')];
  const selected = needs.filter((input) => input.checked).length;
  selectAll.checked = selected === needs.length;
  selectAll.indeterminate = selected > 0 && selected < needs.length;
}

function setGroupError(name, errorId, invalid) {
  form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    if (invalid) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", errorId);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  });
  document.getElementById(errorId).hidden = !invalid;
}

function validate(answers) {
  const problems = [];
  if (!answers.deliveryFormat) {
    problems.push({
      message: "Choose how participants will attend.",
      target: "delivery-in-person",
    });
  }
  if (!answers.eventType) {
    problems.push({
      message: "Choose the expected audience size.",
      target: "size-small",
    });
  }
  return problems;
}

function loadFromUrl() {
  lastSearch = location.search;
  setStatus(status, "");
  setGroupError("deliveryFormat", "delivery-error", false);
  setGroupError("eventType", "size-error", false);
  showErrors(errors, [], undefined, false);
  changeStatusAnnounced = false;
  if (!location.search) {
    restoreFormAnswers(form, {
      deliveryFormat: "",
      eventType: "",
      sessionFeatures: [],
      needs: [],
    });
    updateSelectAll();
    return;
  }
  const parsed = parseAnswersUrl(location.href);
  if (!parsed.errors.length) {
    restoreFormAnswers(form, parsed.answers);
    setStatus(status, "Your previous answers were restored. You can edit them below.");
  } else {
    restoreFormAnswers(form, parsed.answers);
    showErrors(
      errors,
      parsed.errors.map((message) => ({ message })),
      "This shared URL needs review. Valid selections were restored:",
    );
  }
  updateSelectAll();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const answers = readFormAnswers(form);
  const problems = validate(answers);
  form.querySelectorAll("[aria-invalid]").forEach(
    (input) => input.removeAttribute("aria-invalid"),
  );
  if (problems.length) {
    showErrors(errors, problems, "Complete the required answers:");
    setGroupError(
      "deliveryFormat",
      "delivery-error",
      !answers.deliveryFormat,
    );
    setGroupError("eventType", "size-error", !answers.eventType);
    return;
  }
  setGroupError("deliveryFormat", "delivery-error", false);
  setGroupError("eventType", "size-error", false);
  showErrors(errors, []);
  const next = guideUrl(location.href, answers);
  setStatus(status, "Building your personalized guide.");
  location.assign(next);
});

form.addEventListener("change", (event) => {
  if (event.target === selectAll) {
    form.querySelectorAll('input[name="needs"]').forEach((input) => {
      input.checked = selectAll.checked;
    });
  }
  updateSelectAll();
  if (
    event.target.name === "deliveryFormat"
    || event.target.name === "eventType"
  ) {
    const name = event.target.name;
    setGroupError(
      name,
      name === "deliveryFormat" ? "delivery-error" : "size-error",
      false,
    );
    if (!errors.hidden) {
      showErrors(
        errors,
        validate(readFormAnswers(form)),
        "Complete the required answers:",
        false,
      );
    }
  }
  if (!changeStatusAnnounced) {
    setStatus(status, "Answers changed. Select Show my planning path when ready.");
    changeStatusAnnounced = true;
  }
});

form.addEventListener("reset", () => {
  queueMicrotask(() => {
    showErrors(errors, []);
    setGroupError("deliveryFormat", "delivery-error", false);
    setGroupError("eventType", "size-error", false);
    updateSelectAll();
    changeStatusAnnounced = false;
    setStatus(status, "Answers cleared.");
    history.replaceState(null, "", editUrl(location.href, {
      deliveryFormat: "inPerson",
      eventType: "small",
      sessionFeatures: [],
      needs: [],
    }).pathname);
    lastSearch = "";
    form.querySelector("#delivery-in-person").focus();
  });
});

window.addEventListener("popstate", () => {
  if (location.search !== lastSearch) loadFromUrl();
});
loadFromUrl();
updateSelectAll();
