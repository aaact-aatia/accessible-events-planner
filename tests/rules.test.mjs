import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DELIVERY_CHECKLISTS,
  FEATURE_CHECKLISTS,
  NEED_CHECKLISTS,
  SIZE_CHECKLISTS,
  appliesToPath,
  computePlanningPath,
  isActionApplicable,
} from "../js/rules.js";

const inventory = JSON.parse(
  readFileSync(new URL("./fixtures/source-inventory.json", import.meta.url), "utf8"),
);

const EXPECTED_DELIVERY_CHECKLISTS = {
  inPerson: "in-person-checklist",
  virtual: "virtual-checklist",
  hybrid: "hybrid-checklist",
};
const EXPECTED_SIZE_CHECKLISTS = {
  small: "small-meetings",
  large: "large-meetings",
  townhall: "townhall-events",
};
const EXPECTED_FEATURE_CHECKLISTS = {
  training: "presentations",
  formal: "formal-events",
  organizationWide: "townhall-events",
};
const EXPECTED_NEED_CHECKLISTS = {
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
};

test("routing maps match the source contract", () => {
  assert.deepEqual(DELIVERY_CHECKLISTS, EXPECTED_DELIVERY_CHECKLISTS);
  assert.deepEqual(SIZE_CHECKLISTS, EXPECTED_SIZE_CHECKLISTS);
  assert.deepEqual(FEATURE_CHECKLISTS, EXPECTED_FEATURE_CHECKLISTS);
  assert.deepEqual(NEED_CHECKLISTS, EXPECTED_NEED_CHECKLISTS);
});

const subsets = (values) => Array.from(
  { length: 2 ** values.length },
  (_, mask) => values.filter((value, index) => mask & (1 << index)),
);

function expectedRoute(answers) {
  const ids = [
    EXPECTED_DELIVERY_CHECKLISTS[answers.deliveryFormat],
    EXPECTED_SIZE_CHECKLISTS[answers.eventType],
    "core-checklist",
    "accessibility-contact-checklist",
  ];
  for (const feature of answers.sessionFeatures) {
    ids.push(EXPECTED_FEATURE_CHECKLISTS[feature]);
  }
  if (
    answers.eventType === "large"
    || answers.eventType === "townhall"
    || answers.sessionFeatures.includes("formal")
    || answers.sessionFeatures.includes("organizationWide")
  ) {
    ids.push("high-risk-checklist");
  }
  for (const need of answers.needs) {
    ids.push(...EXPECTED_NEED_CHECKLISTS[need]);
  }
  return [...new Set(ids)].sort();
}

test("all 73,728 questionnaire combinations use the expected routing", () => {
  const deliveries = Object.keys(EXPECTED_DELIVERY_CHECKLISTS);
  const sizes = Object.keys(EXPECTED_SIZE_CHECKLISTS);
  const features = subsets(Object.keys(EXPECTED_FEATURE_CHECKLISTS));
  const needs = subsets(Object.keys(EXPECTED_NEED_CHECKLISTS));
  let combinations = 0;

  for (const deliveryFormat of deliveries) {
    for (const eventType of sizes) {
      for (const sessionFeatures of features) {
        for (const selectedNeeds of needs) {
          const answers = {
            deliveryFormat,
            eventType,
            sessionFeatures,
            needs: selectedNeeds,
          };
          assert.deepEqual(
            [...computePlanningPath(answers).checklistIds].sort(),
            expectedRoute(answers),
          );
          combinations += 1;
        }
      }
    }
  }
  assert.equal(combinations, 73_728);
});

function expectedActionApplicability(action, path) {
  const valuesMatch = (condition, selections) => condition === null
    || condition === undefined
    || condition.split(/\s+/).some((value) => selections.includes(value));
  return path.checklistIds.includes(action.section)
    && valuesMatch(action.delivery, [path.deliveryFormat])
    && valuesMatch(action.needs, path.needs)
    && valuesMatch(action.features, path.sessionFeatures);
}

test("applicable content is retained and inapplicable variants are excluded", () => {
  const profiles = [
    {
      deliveryFormat: "inPerson",
      eventType: "small",
      sessionFeatures: [],
      needs: [],
    },
    {
      deliveryFormat: "virtual",
      eventType: "large",
      sessionFeatures: ["training"],
      needs: ["languages", "supports", "interaction"],
    },
    {
      deliveryFormat: "hybrid",
      eventType: "townhall",
      sessionFeatures: ["formal", "organizationWide"],
      needs: ["risk", "presenters", "visual", "prerecorded", "recording", "followup", "cultural"],
    },
  ];

  for (const answers of profiles) {
    const path = {
      ...answers,
      checklistIds: expectedRoute(answers),
    };
    for (const action of inventory.actions) {
      assert.equal(
        isActionApplicable(action, path),
        expectedActionApplicability(action, path),
        action.sourceAction,
      );
    }
  }
});

test("item conditions use any-of within an attribute and all supplied attributes", () => {
  const path = {
    deliveryFormat: "hybrid",
    eventType: "small",
    sessionFeatures: ["formal"],
    needs: ["risk", "supports"],
    checklistIds: ["high-risk-checklist", "accessibility-supports-checklist"],
  };
  assert.equal(appliesToPath({}, path), true);
  assert.equal(appliesToPath({ delivery: "virtual hybrid" }, path), true);
  assert.equal(appliesToPath({ delivery: "inPerson" }, path), false);
  assert.equal(appliesToPath({ needs: "risk recording" }, path), true);
  assert.equal(
    appliesToPath({ needs: "risk", features: "formal" }, path),
    true,
  );
  assert.equal(
    appliesToPath({ needs: "risk", features: "training" }, path),
    false,
  );
});

test("every conditional source action can be recovered from the extracted metadata", () => {
  const conditional = inventory.actions.filter(
    (action) => action.delivery || action.needs || action.features,
  );
  assert.equal(conditional.length, 14);
  for (const action of conditional) {
    const path = {
      deliveryFormat: action.delivery?.split(/\s+/)[0] || "inPerson",
      eventType: "large",
      sessionFeatures: action.features?.split(/\s+/) || [],
      needs: action.needs?.split(/\s+/) || [],
      checklistIds: [action.section],
    };
    assert.equal(isActionApplicable(action, path), true, action.sourceAction);
  }
});

test("backup-plan barrier retains source-variant provenance", () => {
  const backupPlan = inventory.actions.filter(
    (action) => action.title.startsWith("Prepare a backup plan for anything that could fail:"),
  );
  assert.equal(backupPlan.length, 4);
  const supportsVariant = backupPlan.find(
    (action) => action.sourceAction === "accessibility-supports-checklist-4",
  );
  const barrier = "Participants do not know what to do when access issues occur.";
  assert.ok(
    supportsVariant.support["Helps prevent barriers such as:"].some(
      (entry) => entry.text === barrier,
    ),
  );
  assert.equal(
    backupPlan.filter(
      (action) => action.support["Helps prevent barriers such as:"].some(
        (entry) => entry.text === barrier,
      ),
    ).length,
    1,
  );

  const supportsOnly = computePlanningPath({
    deliveryFormat: "inPerson",
    eventType: "small",
    sessionFeatures: [],
    needs: ["supports"],
  });
  const applicableVariants = backupPlan.filter(
    (action) => isActionApplicable(action, supportsOnly),
  );
  assert.deepEqual(
    applicableVariants.map((action) => action.sourceAction),
    ["accessibility-supports-checklist-4"],
  );

  const formalOnly = computePlanningPath({
    deliveryFormat: "inPerson",
    eventType: "small",
    sessionFeatures: ["formal"],
    needs: [],
  });
  assert.equal(
    backupPlan.some(
      (action) => isActionApplicable(action, formalOnly)
        && action.sourceAction === "accessibility-supports-checklist-4",
    ),
    false,
  );
});

test("unsupported and missing answers fail visibly", () => {
  assert.throws(() => computePlanningPath({}), /Choose a delivery format/);
  assert.throws(
    () => computePlanningPath({ deliveryFormat: "unknown", eventType: "small" }),
    /Choose a delivery format/,
  );
  assert.throws(
    () => computePlanningPath({
      deliveryFormat: "virtual",
      eventType: "small",
      needs: ["unknown"],
    }),
    /not recognized/,
  );
  assert.deepEqual(
    computePlanningPath({
      deliveryFormat: "virtual",
      eventType: "small",
      sessionFeatures: ["training", "training"],
      needs: ["visual", "visual"],
    }).needs,
    ["visual"],
  );
});
