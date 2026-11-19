import { downloadGuide, printGuide } from "./export.js";
import { setStatus } from "./shared.js";

const controls = document.getElementById("complete-guide-controls");
const status = document.getElementById("complete-guide-status");
const downloadButton = document.getElementById("download-complete-guide");
const nativeDownloadButton = document.getElementById("download-complete-guide-native");
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

async function downloadCurrentGuide() {
  if (downloadButton.getAttribute("aria-disabled") === "true") return;
  try {
    setStatus(status, "Preparing standalone guide.");
    downloadButton.setAttribute("aria-disabled", "true");
    await downloadGuide(
      "complete-accessible-events-guide.html",
      "Complete accessible meetings and events planning guide",
      document.querySelector("main"),
    );
    setStatus(status, "Standalone complete guide downloaded.");
  } catch (error) {
    setStatus(status, "The standalone guide could not be prepared.");
    console.error(error);
  } finally {
    downloadButton.removeAttribute("aria-disabled");
  }
}

nativeDownloadButton.addEventListener("click", downloadCurrentGuide);
downloadButton.addEventListener("gcdsClick", downloadCurrentGuide);

window.addEventListener("hashchange", focusFragment);
window.addEventListener("load", focusFragment, { once: true });
requestAnimationFrame(focusFragment);
