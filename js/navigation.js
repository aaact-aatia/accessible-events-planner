import { hasPlannerParameters, parseAnswersUrl } from "./rules.js";

const desktopColumns = new WeakMap();

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
window.addEventListener("beforeprint", () => {
  document.querySelectorAll("gcds-grid.action-grid").forEach((grid) => {
    desktopColumns.set(grid, grid.getAttribute("columns-desktop"));
    grid.setAttribute("columns-desktop", "1fr");
  });
});
window.addEventListener("afterprint", () => {
  document.querySelectorAll("gcds-grid.action-grid").forEach((grid) => {
    const columns = desktopColumns.get(grid);
    if (columns === null) {
      grid.removeAttribute("columns-desktop");
    } else if (columns !== undefined) {
      grid.setAttribute("columns-desktop", columns);
    }
    desktopColumns.delete(grid);
  });
});
updatePersonalizedGuideLink();
