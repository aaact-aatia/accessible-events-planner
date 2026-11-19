export function showErrors(
  container,
  errors,
  prefix = "Review the following:",
  moveFocus = true,
) {
  const gcdsSummary = container.parentElement?.querySelector(
    `.gcds-error-enhancement`,
  );
  if (
    gcdsSummary
    && document.documentElement.classList.contains("gcds-errors-ready")
    && errors.every(({ target }) => target)
  ) {
    if (!errors.length) {
      gcdsSummary.hidden = true;
      gcdsSummary.errorLinks = {};
      container.hidden = true;
      return;
    }
    gcdsSummary.errorLinks = Object.fromEntries(
      errors.map(({ message, target }) => [
        `#${target}`,
        message,
      ]),
    );
    gcdsSummary.hidden = false;
    container.hidden = true;
    if (moveFocus) gcdsSummary.focus();
    return;
  }
  if (gcdsSummary) gcdsSummary.hidden = true;
  container.replaceChildren();
  if (!errors.length) {
    container.hidden = true;
    return;
  }
  const heading = document.createElement("h2");
  heading.id = "error-summary-heading";
  heading.textContent = "There is a problem";
  const intro = document.createElement("p");
  intro.textContent = prefix;
  const list = document.createElement("ul");
  errors.forEach(({ message, target }) => {
    const item = document.createElement("li");
    if (target) {
      const link = document.createElement("a");
      link.href = `#${target}`;
      link.textContent = message;
      item.append(link);
    } else {
      item.textContent = message;
    }
    list.append(item);
  });
  container.append(heading, intro, list);
  container.hidden = false;
  if (moveFocus) container.focus();
}

export function setStatus(element, message) {
  element.textContent = "";
  queueMicrotask(() => {
    element.textContent = message;
  });
}

export function readFormAnswers(form) {
  const enhanced = (name) => {
    const host = form.querySelector(`gcds-checkboxes[name="${name}"]`);
    if (
      document.documentElement.classList.contains("gcds-checkboxes-ready")
      && host
    ) {
      return Array.isArray(host.value) ? [...host.value] : [];
    }
    return [...form.querySelectorAll(
      `input[name="${name}"]:checked`,
    )].map((input) => input.value);
  };
  const selectedRadio = (name) => {
    const host = form.querySelector(`gcds-radios[name="${name}"]`);
    if (
      document.documentElement.classList.contains("gcds-radios-ready")
      && host
    ) {
      return host.value || "";
    }
    return [...form.querySelectorAll(
      `input[name="${name}"]:checked`,
    )].map((input) => input.value)[0] || "";
  };
  return {
    deliveryFormat: selectedRadio("deliveryFormat"),
    eventType: selectedRadio("eventType"),
    sessionFeatures: enhanced("sessionFeatures"),
    needs: enhanced("needs"),
  };
}

export function restoreFormAnswers(form, answers) {
  form.querySelectorAll("input[name]").forEach((input) => {
    const values = input.name === "deliveryFormat"
      ? [answers.deliveryFormat]
      : input.name === "eventType"
        ? [answers.eventType]
        : answers[input.name] || [];
    input.checked = values.includes(input.value);
  });
  form.querySelectorAll("gcds-checkboxes").forEach((host) => {
    host.value = [...(answers[host.name] || [])];
  });
  form.querySelectorAll("gcds-radios").forEach((host) => {
    host.value = answers[host.name] || "";
  });
}
