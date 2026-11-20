import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { pbkdf2Sync } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const password = process.env.AEP_PREVIEW_PASSWORD;

if (!password || password.trim().length === 0) {
  throw new Error(
    "AEP_PREVIEW_PASSWORD is missing or empty. Configure it for this Netlify deploy context before publishing.",
  );
}

const files = [
  ["index.html", "index.html"],
  ["guide.html", "guide.html"],
  ["full-guide.html", "full-guide.html"],
  ["css/styles.css", "css/styles.css"],
  ["css/print.css", "css/print.css"],
  ["js/questionnaire.js", "js/questionnaire.js"],
  ["js/guide.js", "js/guide.js"],
  ["js/rules.js", "js/rules.js"],
  ["js/export.js", "js/export.js"],
  ["js/navigation.js", "js/navigation.js"],
  ["js/shell.js", "js/shell.js"],
  ["js/shared.js", "js/shared.js"],
  ["js/content.js", "js/content.js"],
  ["js/full-guide.js", "js/full-guide.js"],
  ["hosting/preview-gate.css", "css/preview-gate.css"],
  ["hosting/preview-gate.js", "js/preview-gate.js"],
];
const htmlFiles = ["index.html", "guide.html", "full-guide.html"];
const salt = "accessible-events-planner-preview-v1";
const iterations = 120_000;
const verifier = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
const gateTemplate = readFileSync(resolve(root, "hosting/preview-gate.html"), "utf8");

rmSync(output, { recursive: true, force: true });

for (const [sourcePath, destinationPath] of files) {
  const source = resolve(root, sourcePath);
  const destination = resolve(output, destinationPath);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

const gateAssets = `
  <link rel="stylesheet" href="css/preview-gate.css">
  <script src="js/preview-gate-config.js"></script>
  <script src="js/preview-gate.js"></script>`;

for (const htmlFile of htmlFiles) {
  const path = resolve(output, htmlFile);
  const original = readFileSync(path, "utf8");
  const headEnd = original.indexOf("</head>");
  const bodyStart = original.match(/<body([^>]*)>/i);
  const bodyEnd = original.lastIndexOf("</body>");
  if (headEnd === -1 || !bodyStart || bodyEnd === -1) {
    throw new Error(`Cannot prepare preview gate for ${htmlFile}: missing head or body.`);
  }

  const bodyOpenEnd = bodyStart.index + bodyStart[0].length;
  const bodyAttributes = bodyStart[1] || "";
  const bodyContent = original.slice(bodyOpenEnd, bodyEnd);
  const headerEnd = bodyContent.indexOf("</gcds-header>");
  if (headerEnd === -1) {
    throw new Error(`Cannot prepare preview gate for ${htmlFile}: missing GCDS header.`);
  }
  const session = `<div class="preview-gate-session" hidden>
    <button type="button" id="preview-gate-sign-out">Sign out of this preview tab</button>
    <p id="preview-gate-storage-message" role="status" hidden></p>
  </div>`;
  const insertionPoint = headerEnd + "</gcds-header>".length;
  const contentWithSession = `${bodyContent.slice(0, insertionPoint)}
${session}
${bodyContent.slice(insertionPoint)}`;
  const gatedBody = `<body${bodyAttributes}>
  <div id="preview-gate-content">${contentWithSession}</div>
${gateTemplate}
</body>`;
  const prepared = `${original.slice(0, headEnd)}${gateAssets}
${original.slice(headEnd, bodyStart.index)}${gatedBody}${original.slice(bodyEnd + "</body>".length)}`;
  writeFileSync(path, prepared, "utf8");
}

mkdirSync(resolve(output, "js"), { recursive: true });
writeFileSync(
  resolve(output, "js/preview-gate-config.js"),
  `window.AEP_PREVIEW_GATE_CONFIG = Object.freeze(${JSON.stringify({
    version: 1,
    iterations,
    salt,
    verifier,
  })});\n`,
  "utf8",
);

const publishedFiles = [];
function collect(directory) {
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) {
      collect(path);
    } else {
      publishedFiles.push(relative(output, path));
    }
  }
}
collect(output);

const expectedFiles = [
  "index.html",
  "guide.html",
  "full-guide.html",
  "css/styles.css",
  "css/print.css",
  "css/preview-gate.css",
  "js/questionnaire.js",
  "js/guide.js",
  "js/rules.js",
  "js/export.js",
  "js/navigation.js",
  "js/shell.js",
  "js/shared.js",
  "js/content.js",
  "js/full-guide.js",
  "js/preview-gate.js",
  "js/preview-gate-config.js",
].sort();

if (JSON.stringify(publishedFiles.sort()) !== JSON.stringify(expectedFiles)) {
  throw new Error("Deployment preparation produced an unexpected file inventory.");
}

console.log(`Deployment directory prepared with ${publishedFiles.length} allowlisted files.`);
