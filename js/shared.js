export function showErrors(
  container,
  errors,
  prefix = "Review the following:",
  moveFocus = true,
) {
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
  const selected = (name) => enhanced(name);
  return {
    deliveryFormat: selected("deliveryFormat")[0] || "",
    eventType: selected("eventType")[0] || "",
    sessionFeatures: selected("sessionFeatures"),
    needs: selected("needs"),
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
}
