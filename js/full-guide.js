import { printGuide } from "./export.js";

const controls = document.getElementById("complete-guide-controls");
const printButton = document.getElementById("print-complete-guide");
const nativePrintButton = document.getElementById("print-complete-guide-native");

controls.hidden = false;

function focusFragment() {
  if (!location.hash) return;
  let target = null;
  try {
    target = document.querySelector(location.hash);
  } catch {
    return;
  }
  if (target?.classList.contains("legacy-fragment")) {
    target = target.closest(".guide-action");
  }
  if (!target) return;
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.scrollIntoView({ block: "start" });
  target.focus({ preventScroll: true });
}

nativePrintButton.addEventListener("click", () => printGuide());
printButton.addEventListener("gcdsClick", () => printGuide());

window.addEventListener("hashchange", focusFragment);
window.addEventListener("load", focusFragment, { once: true });
requestAnimationFrame(focusFragment);
