import { hasPlannerParameters, parseAnswersUrl } from "./rules.js";

function updatePersonalizedGuideLink() {
  const item = document.querySelector("[data-personalized-guide-link]");
  if (!item) return;

  const url = new URL(location.href);
  const parsed = hasPlannerParameters(url)
    ? parseAnswersUrl(url)
    : null;
  const usable = parsed && parsed.errors.length === 0;

  item.hidden = !usable;
  if (!usable) return;

  const link = item.querySelector("a");
  const destination = new URL("guide.html", location.href);
  destination.search = url.search;
  link.href = destination;
}

window.addEventListener("popstate", updatePersonalizedGuideLink);
window.addEventListener("hashchange", updatePersonalizedGuideLink);
window.addEventListener("planner-statechange", updatePersonalizedGuideLink);
updatePersonalizedGuideLink();
