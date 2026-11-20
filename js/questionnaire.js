import {
  editUrl,
  guideUrl,
  hasPlannerParameters,
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
const nativeSelectAll = document.getElementById("select-all-needs-native");
let lastSearch = null;
let changeStatusAnnounced = false;
let checkboxHostsReady = false;
let radioHostsReady = false;
let fieldsetHostsReady = false;
let errorSummarySource = null;

document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

function updateSelectAll() {
  const needsHost = form.querySelector("#needs-checkboxes");
  const needs = checkboxHostsReady && fieldsetHostsReady
    ? [...needsHost.value]
    : [...form.querySelectorAll('input[name="needs"]:checked')];
  const selected = needs.length;
  const total = 10;
  selectAll.value = selected === total ? ["all"] : [];
  nativeSelectAll.checked = selected === total;
  nativeSelectAll.indeterminate = selected > 0 && selected < total;
}

function syncNativeCheckboxes(host) {
  const values = Array.isArray(host.value) ? host.value : [];
  form.querySelectorAll(`input[name="${host.name}"]`).forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function syncNativeRadio(host) {
  form.querySelectorAll(`input[name="${host.name}"]`).forEach((input) => {
    input.checked = input.value === host.value;
  });
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
  const radioHost = form.querySelector(`gcds-radios[name="${name}"]`);
  if (radioHostsReady && radioHost) {
    radioHost.errorMessage = invalid
      ? document.getElementById(errorId).textContent
      : "";
  }
}

async function enhanceCheckboxes() {
  await customElements.whenDefined("gcds-checkboxes");
  const hosts = [...form.querySelectorAll("gcds-checkboxes")];
  await Promise.all(
    hosts.map((host) => host.componentOnReady?.() || Promise.resolve()),
  );
  const answers = readFormAnswers(form);
  hosts.forEach((host) => {
    host.value = [...(answers[host.name] || [])];
    syncNativeCheckboxes(host);
  });
  const fallback = document.activeElement.closest?.(
    ".native-questionnaire-control-fallback",
  );
  if (fallback) {
    await new Promise((resolve) => {
      const finish = () => {
        requestAnimationFrame(() => {
          if (document.activeElement.closest?.(
            ".native-questionnaire-control-fallback",
          )) {
            return;
          }
          form.removeEventListener("focusout", finish);
          resolve();
        });
      };
      form.addEventListener("focusout", finish);
    });
    const latestAnswers = readFormAnswers(form);
    hosts.forEach((host) => {
      host.value = [...(latestAnswers[host.name] || [])];
      syncNativeCheckboxes(host);
    });
  }
  checkboxHostsReady = true;
  document.documentElement.classList.add("gcds-checkboxes-ready");
  updateSelectAll();
}

async function enhanceRadios() {
  await customElements.whenDefined("gcds-radios");
  const hosts = [...form.querySelectorAll("gcds-radios")];
  await Promise.all(
    hosts.map((host) => host.componentOnReady?.() || Promise.resolve()),
  );
  const answers = readFormAnswers(form);
  hosts.forEach((host) => {
    host.value = answers[host.name] || "";
    syncNativeRadio(host);
  });
  const fallback = document.activeElement.closest?.(
    ".native-questionnaire-control-fallback",
  );
  if (fallback) {
    await new Promise((resolve) => {
      const finish = () => {
        requestAnimationFrame(() => {
          if (document.activeElement.closest?.(
            ".native-questionnaire-control-fallback",
          )) {
            return;
          }
          form.removeEventListener("focusout", finish);
          resolve();
        });
      };
      form.addEventListener("focusout", finish);
    });
    const latestAnswers = readFormAnswers(form);
    hosts.forEach((host) => {
      host.value = latestAnswers[host.name] || "";
      syncNativeRadio(host);
    });
  }
  radioHostsReady = true;
  setGroupError("deliveryFormat", "delivery-error", false);
  setGroupError("eventType", "size-error", false);
  refreshActiveErrors();
  document.documentElement.classList.add("gcds-radios-ready");
}

async function enhanceFieldsets() {
  await customElements.whenDefined("gcds-fieldset");
  const hosts = [...form.querySelectorAll("gcds-fieldset")];
  await Promise.all(
    hosts.map((host) => host.componentOnReady?.() || Promise.resolve()),
  );
  if (document.activeElement.closest?.(
    ".native-questionnaire-control-fallback",
  )) {
    await new Promise((resolve) => {
      const finish = () => {
        requestAnimationFrame(() => {
          if (document.activeElement.closest?.(
            ".native-questionnaire-control-fallback",
          )) {
            return;
          }
          form.removeEventListener("focusout", finish);
          resolve();
        });
      };
      form.addEventListener("focusout", finish);
    });
  }
  restoreFormAnswers(form, readFormAnswers(form));
  fieldsetHostsReady = true;
  document.documentElement.classList.add("gcds-fieldsets-ready");
  updateSelectAll();
  refreshActiveErrors();
}

function validate(answers) {
  const problems = [];
  if (!answers.deliveryFormat) {
    problems.push({
      message: "Choose how participants will attend.",
      target: radioHostsReady
        ? "delivery-format-radios"
        : "delivery-in-person",
    });
  }
  if (!answers.eventType) {
    problems.push({
      message: "Choose the expected audience size.",
      target: fieldsetHostsReady ? "event-type-radios" : "size-small",
    });
  }
  return problems;
}

function refreshActiveErrors() {
  if (errorSummarySource !== "validation") return;
  const gcdsSummary = document.getElementById("questionnaire-gcds-errors");
  if (errors.hidden && gcdsSummary.hidden) return;
  showErrors(
    errors,
    validate(readFormAnswers(form)),
    "Complete the required answers:",
    false,
  );
}

function loadFromUrl() {
  lastSearch = location.search;
  setStatus(status, "");
  setGroupError("deliveryFormat", "delivery-error", false);
  setGroupError("eventType", "size-error", false);
  errorSummarySource = null;
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
  if (!hasPlannerParameters(location.href)) {
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
    errorSummarySource = "url";
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
    errorSummarySource = "validation";
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
  errorSummarySource = null;
  showErrors(errors, []);
  const next = guideUrl(location.href, answers);
  setStatus(status, "Building your personalized guide.");
  location.assign(next);
});

errors.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || !radioHostsReady) return;
  const target = document.querySelector(link.hash);
  if (!target?.matches("gcds-radios")) return;
  event.preventDefault();
  history.pushState(null, "", link.hash);
  target.focus();
});

form.addEventListener("change", (event) => {
  if (event.target === nativeSelectAll) {
    form.querySelectorAll('input[name="needs"]').forEach((input) => {
      input.checked = nativeSelectAll.checked;
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
    refreshActiveErrors();
  }
  if (!changeStatusAnnounced) {
    setStatus(status, "Answers changed. Select Show my planning path when ready.");
    changeStatusAnnounced = true;
  }
});

form.addEventListener("gcdsChange", (event) => {
  const host = event.target.closest?.("gcds-checkboxes");
  if (host === selectAll) {
    const values = host.value.includes("all")
      ? [
          "risk", "languages", "supports", "presenters", "visual",
          "prerecorded", "interaction", "recording", "followup",
          "cultural",
        ]
      : [];
    form.querySelector("#needs-checkboxes").value = [...values];
    syncNativeCheckboxes(form.querySelector("#needs-checkboxes"));
  } else if (host) {
    syncNativeCheckboxes(host);
  }
  const radioHost = event.target.closest?.("gcds-radios");
  if (radioHost) {
    syncNativeRadio(radioHost);
    setGroupError(
      radioHost.name,
      radioHost.name === "deliveryFormat" ? "delivery-error" : "size-error",
      false,
    );
    refreshActiveErrors();
  }
  updateSelectAll();
  if (!changeStatusAnnounced) {
    setStatus(status, "Answers changed. Select Show my planning path when ready.");
    changeStatusAnnounced = true;
  }
});

form.addEventListener("reset", () => {
  queueMicrotask(() => {
    if (checkboxHostsReady) {
      requestAnimationFrame(() => {
        form.querySelectorAll("gcds-checkboxes").forEach((host) => {
          host.value = [];
          syncNativeCheckboxes(host);
        });
        updateSelectAll();
      });
    }
    if (radioHostsReady) {
      requestAnimationFrame(() => {
        form.querySelectorAll("gcds-radios").forEach((host) => {
          host.value = "";
          syncNativeRadio(host);
        });
      });
    }
    setGroupError("deliveryFormat", "delivery-error", false);
    setGroupError("eventType", "size-error", false);
    errorSummarySource = null;
    showErrors(errors, []);
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
    window.dispatchEvent(new Event("planner-statechange"));
    if (radioHostsReady) {
      form.querySelector("#delivery-format-radios").focus();
    } else {
      form.querySelector("#delivery-in-person").focus();
    }
  });
});

window.addEventListener("popstate", () => {
  if (location.search !== lastSearch) loadFromUrl();
});
loadFromUrl();
updateSelectAll();
Promise.all([enhanceCheckboxes(), enhanceRadios()])
  .then(enhanceFieldsets)
  .catch((error) => {
    console.error("The GC Design System questionnaire could not be loaded.", error);
  });
