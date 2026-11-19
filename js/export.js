async function inlineStyles() {
  const responses = await Promise.all(
    ["./css/styles.css", "./css/print.css"].map((path) => fetch(path)),
  );
  if (responses.some((response) => !response.ok)) {
    throw new Error("The print and screen styles could not be loaded.");
  }
  return (await Promise.all(responses.map((response) => response.text())))
    .join("\n");
}

function serializeGuideContent(source, title) {
  const main = source.cloneNode(true);
  main.querySelectorAll(
    "script, noscript, [role=\"status\"], .page-controls, .site-header, .site-footer, .no-export, " +
    ".error-summary, #source-content-registry, #guide-errors, #guide-status, #complete-guide-status, " +
    ".preview-gate-dialog, .preview-gate-session, #preview-gate-content > " +
    ".preview-gate-dialog",
  ).forEach((node) => node.remove());
  main.removeAttribute("id");
  main.querySelectorAll("[hidden]").forEach((node) => node.remove());
  main.querySelectorAll("button").forEach((node) => node.remove());
  const heading = main.querySelector("h1");
  if (heading) heading.removeAttribute("tabindex");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeText(title)}</title>
  <style>${CSS_PLACEHOLDER}</style>
</head>
<body>
<main id="main-content">${main.innerHTML}</main>
</body>
</html>`;
}

const CSS_PLACEHOLDER = "__AEP_EMBEDDED_CSS__";

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

export async function standaloneDocument(title, source) {
  const snapshot = source.cloneNode(true);
  const styles = await inlineStyles();
  return serializeGuideContent(snapshot, title).replace(CSS_PLACEHOLDER, styles);
}

export async function downloadGuide(filename, title, source) {
  const html = await standaloneDocument(title, source);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printGuide() {
  window.print();
}
