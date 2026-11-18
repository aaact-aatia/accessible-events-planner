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
