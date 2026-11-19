export const URL_VERSION = "1";

export const DELIVERY_LABELS = Object.freeze({
  inPerson: "In-person only",
  virtual: "Virtual only",
  hybrid: "Hybrid",
});

export const DELIVERY_CHECKLISTS = Object.freeze({
  inPerson: "in-person-checklist",
  virtual: "virtual-checklist",
  hybrid: "hybrid-checklist",
});

export const SIZE_LABELS = Object.freeze({
  small: "1–25 participants",
  large: "26–100 participants",
  townhall: "101 or more participants",
});

export const SIZE_CHECKLISTS = Object.freeze({
  small: "small-meetings",
  large: "large-meetings",
  townhall: "townhall-events",
});

export const FEATURE_LABELS = Object.freeze({
  training: "Training, workshop, or presentation",
  formal: "Public, formal, technical, legal, or high-profile event",
  organizationWide: "Town hall or organization-wide session",
});

export const FEATURE_CHECKLISTS = Object.freeze({
  training: "presentations",
  formal: "formal-events",
  organizationWide: "townhall-events",
});

export const NEED_LABELS = Object.freeze({
  risk: "High-risk content",
  languages: "Bilingual or spoken-language interpretation",
  supports: "Accessibility supports",
  presenters: "Multiple presenters",
  visual: "Visual content",
  prerecorded: "Pre-recorded content",
  interaction: "Interaction",
  recording: "Recording the session",
  followup: "Sharing follow-up materials",
  cultural: "Indigenous, cultural, or community considerations",
});

export const NEED_CHECKLISTS = Object.freeze({
  risk: ["high-risk-checklist"],
  languages: ["bilingual-checklist"],
  supports: ["accessibility-supports-checklist"],
  presenters: ["presenter-coordination-checklist"],
  visual: ["visual-content-checklist"],
  prerecorded: ["prerecorded-media-checklist"],
  interaction: ["interaction-checklist"],
  recording: ["recording-followup-checklist", "high-risk-checklist"],
  followup: ["recording-followup-checklist"],
  cultural: ["cultural-considerations-checklist"],
});

export const CORE_CHECKLISTS = Object.freeze([
  "core-checklist",
  "accessibility-contact-checklist",
]);

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const PLANNER_PARAMETER_NAMES = Object.freeze([
  "v",
  "delivery",
  "size",
  "features",
  "needs",
]);

export function isTrackingParameter(name) {
  return name.startsWith("utm_")
    || name === "gclid"
    || name === "fbclid";
}

export function hasPlannerParameters(input) {
  const url = input instanceof URL ? input : new URL(input, "https://example.invalid");
  return PLANNER_PARAMETER_NAMES.some((name) => url.searchParams.has(name));
}

export function computePlanningPath(answers) {
  if (
    !answers
    || !own(DELIVERY_LABELS, answers.deliveryFormat)
    || !own(SIZE_LABELS, answers.eventType)
  ) {
    throw new Error("Choose a delivery format and audience size.");
  }

  const features = [...new Set(answers.sessionFeatures || [])];
  const needs = [...new Set(answers.needs || [])];
  if (
    features.some((value) => !own(FEATURE_LABELS, value))
    || needs.some((value) => !own(NEED_LABELS, value))
  ) {
    throw new Error("An answer is not recognized. Review the question values and routing maps.");
  }

  const ids = [
    DELIVERY_CHECKLISTS[answers.deliveryFormat],
    SIZE_CHECKLISTS[answers.eventType],
    ...CORE_CHECKLISTS,
  ];
  features.forEach((value) => ids.push(FEATURE_CHECKLISTS[value]));

  if (
    answers.eventType !== "small"
    || features.includes("formal")
    || features.includes("organizationWide")
  ) {
    ids.push("high-risk-checklist");
  }
  needs.forEach((value) => ids.push(...NEED_CHECKLISTS[value]));

  return {
    deliveryFormat: answers.deliveryFormat,
    eventType: answers.eventType,
    sessionFeatures: features,
    needs,
    checklistIds: [...new Set(ids)],
  };
}

export function appliesToPath(attributes, path) {
  const matches = (value, selected) => !value
    || value.split(/\s+/).some((candidate) => selected.includes(candidate));

  return matches(attributes.delivery, [path.deliveryFormat])
    && matches(attributes.needs, path.needs)
    && matches(attributes.features, path.sessionFeatures);
}

export function isActionApplicable(action, path) {
  const routedSection = action.section
    ? path.checklistIds.includes(action.section)
    : true;

  return routedSection
    && appliesToPath(
      {
        delivery: action.delivery,
        needs: action.needs,
        features: action.features,
      },
      path,
    );
}

function ordered(values, allowed) {
  return Object.keys(allowed).filter((value) => values.includes(value));
}

export function serializeAnswers(answers) {
  const path = computePlanningPath(answers);
  const params = new URLSearchParams();
  params.set("v", URL_VERSION);
  params.set("delivery", path.deliveryFormat);
  params.set("size", path.eventType);
  const features = ordered(path.sessionFeatures, FEATURE_LABELS);
  const needs = ordered(path.needs, NEED_LABELS);
  if (features.length) params.set("features", features.join(","));
  if (needs.length) params.set("needs", needs.join(","));
  return params;
}

export function guideUrl(base, answers) {
  const url = new URL("guide.html", base);
  url.search = serializeAnswers(answers);
  return url;
}

export function editUrl(base, answers) {
  const url = new URL("index.html", base);
  url.search = serializeAnswers(answers);
  return url;
}

function readUnique(params, name, errors) {
  const values = params.getAll(name);
  if (values.length > 1) {
    errors.push(`The ${name} parameter appears more than once.`);
    return null;
  }
  return values[0] ?? null;
}

function readList(params, name, allowed, errors) {
  const raw = readUnique(params, name, errors);
  if (raw === null) return [];
  if (raw === "") {
    errors.push(`The ${name} parameter contains an empty value.`);
    return [];
  }
  if (raw.includes(",,")) {
    errors.push(`The ${name} parameter contains an empty value.`);
  }
  const values = raw.split(",");
  if (values.some((value) => !value)) {
    errors.push(`The ${name} parameter contains an empty value.`);
  }
  if (values.length !== new Set(values).size) {
    errors.push(`The ${name} parameter contains a duplicate value.`);
  }
  const unknown = values.filter(
    (value) => value && !own(allowed, value),
  );
  if (unknown.length) {
    errors.push(`The ${name} parameter contains an unsupported value: ${unknown.join(", ")}.`);
  }
  return values.filter((value) => own(allowed, value));
}

export function parseAnswersUrl(input) {
  const url = input instanceof URL ? input : new URL(input, "https://example.invalid");
  const params = url.searchParams;
  const errors = [];
  const allowedNames = new Set(PLANNER_PARAMETER_NAMES);

  params.forEach((_value, name) => {
    if (!allowedNames.has(name) && !isTrackingParameter(name)) {
      errors.push(`The ${name} parameter is not supported.`);
    }
  });

  const version = readUnique(params, "v", errors);
  if (version !== URL_VERSION) {
    errors.push(version
      ? `URL version ${version} is not supported.`
      : `The URL version is missing; version ${URL_VERSION} is required.`);
  }
  const deliveryFormat = readUnique(params, "delivery", errors);
  const eventType = readUnique(params, "size", errors);
  if (!deliveryFormat || !own(DELIVERY_LABELS, deliveryFormat)) {
    errors.push("Choose a supported delivery format.");
  }
  if (!eventType || !own(SIZE_LABELS, eventType)) {
    errors.push("Choose a supported audience size.");
  }
  const sessionFeatures = readList(
    params,
    "features",
    FEATURE_LABELS,
    errors,
  );
  const needs = readList(params, "needs", NEED_LABELS, errors);

  return {
    answers: {
      deliveryFormat,
      eventType,
      sessionFeatures: ordered(sessionFeatures, FEATURE_LABELS),
      needs: ordered(needs, NEED_LABELS),
    },
    errors: [...new Set(errors)],
  };
}
