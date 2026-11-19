from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import unittest
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
TEST_PASSWORD = "unit-test-preview-password-not-a-real-secret"
EXPECTED_FILES = {
    "index.html",
    "guide.html",
    "full-guide.html",
    "css/preview-gate.css",
    "css/print.css",
    "css/styles.css",
    "js/export.js",
    "js/navigation.js",
    "js/shell.js",
    "js/shared.js",
    "js/content.js",
    "js/full-guide.js",
    "js/guide.js",
    "js/preview-gate-config.js",
    "js/preview-gate.js",
    "js/questionnaire.js",
    "js/rules.js",
}
HOSTED_HTML = ("index.html", "guide.html", "full-guide.html")


def prepare(password: str = TEST_PASSWORD) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    if password is None:
        environment.pop("AEP_PREVIEW_PASSWORD", None)
    else:
        environment["AEP_PREVIEW_PASSWORD"] = password
    return subprocess.run(
        ["npm", "run", "prepare:deploy"],
        cwd=ROOT,
        env=environment,
        text=True,
        capture_output=True,
    )


class DeploymentPreparationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        result = prepare()
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)

    @classmethod
    def tearDownClass(cls) -> None:
        shutil.rmtree(DIST, ignore_errors=True)

    def test_missing_and_empty_passwords_fail_before_publishing(self) -> None:
        expected = "AEP_PREVIEW_PASSWORD is missing or empty"
        for value in (None, "", "   "):
            result = prepare(value)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(expected, result.stderr)
        self.assertNotIn(TEST_PASSWORD, result.stdout)
        self.assertNotIn(TEST_PASSWORD, result.stderr)

    def test_dist_contains_only_the_explicit_website_allowlist(self) -> None:
        files = {
            str(path.relative_to(DIST))
            for path in DIST.rglob("*")
            if path.is_file()
        }
        self.assertEqual(files, EXPECTED_FILES)
        prohibited = (
            ".github",
            "docs",
            "tests",
            "scripts",
            "hosting",
            "AGENTS.md",
            "CONTRIBUTING.md",
            "package.json",
            "netlify.toml",
            "requirements.txt",
            ".env",
            ".env.example",
        )
        for path in files:
            self.assertFalse(path.startswith(prohibited), path)
        self.assertFalse(any(Path(path).name.startswith(".env") for path in files))

    def test_local_script_uses_node_env_file_without_dependency_packages(self) -> None:
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertEqual(
            package["scripts"]["prepare:local"],
            "node --env-file=.env scripts/prepare-deploy.mjs",
        )
        self.assertEqual(
            package["scripts"]["prepare:deploy"],
            "node scripts/prepare-deploy.mjs",
        )
        dependencies = {
            **package.get("dependencies", {}),
            **package.get("devDependencies", {}),
        }
        self.assertNotIn("dotenv", dependencies)

        ignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn(".env", ignore.splitlines())
        self.assertIn(".env.*", ignore.splitlines())
        self.assertIn("!.env.example", ignore.splitlines())
        self.assertEqual(
            (ROOT / ".env.example").read_text(encoding="utf-8").strip(),
            "AEP_PREVIEW_PASSWORD=local-preview-password",
        )

    def test_all_deployed_pages_have_the_gate_and_canonical_sources_do_not(self) -> None:
        for name in HOSTED_HTML:
            deployed = BeautifulSoup(
                (DIST / name).read_text(encoding="utf-8"),
                "html.parser",
            )
            self.assertIsNotNone(deployed.select_one("dialog.preview-gate-dialog"))
            self.assertIsNotNone(
                deployed.select_one('script[src="js/preview-gate.js"]')
            )
            self.assertIsNotNone(
                deployed.select_one('script[src="js/preview-gate-config.js"]')
            )
            self.assertIsNotNone(
                deployed.select_one(
                    'button#preview-gate-sign-out[type="button"]'
                )
            )
            session = deployed.select_one(".preview-gate-session")
            self.assertIsNotNone(session.find_parent(id="preview-gate-content"))
            header = deployed.select_one("gcds-header")
            self.assertTrue(
                header.find_next_sibling(class_="preview-gate-session")
                is not None
            )
            self.assertIsNotNone(
                deployed.select_one(
                    'dialog a[href="https://a11y.canada.ca/en/"]'
                )
            )
            self.assertIsNotNone(deployed.select_one("dialog form"))
            self.assertIsNotNone(
                deployed.select_one(
                    'dialog input[type="password"][required][autofocus]'
                )
            )
            self.assertEqual(
                deployed.select_one("#preview-gate-error")["role"],
                "alert",
            )
            self.assertIn("</body>", (DIST / name).read_text(encoding="utf-8"))

            canonical = BeautifulSoup(
                (ROOT / name).read_text(encoding="utf-8"),
                "html.parser",
            )
            self.assertIsNone(canonical.select_one(".preview-gate-dialog"))
            self.assertIsNone(canonical.select_one('script[src*="preview-gate"]'))

    def test_generated_config_verifies_dummy_password_without_containing_it(self) -> None:
        config_source = (DIST / "js/preview-gate-config.js").read_text(
            encoding="utf-8"
        )
        match = re.search(r"Object\.freeze\((\{.*\})\)", config_source)
        self.assertIsNotNone(match)
        config = json.loads(match.group(1))
        verifier = hashlib.pbkdf2_hmac(
            "sha256",
            TEST_PASSWORD.encode("utf-8"),
            config["salt"].encode("utf-8"),
            config["iterations"],
            dklen=32,
        ).hex()
        self.assertEqual(verifier, config["verifier"])
        for path in DIST.rglob("*"):
            if path.is_file():
                self.assertNotIn(TEST_PASSWORD, path.read_text(errors="ignore"))

    def test_gate_preserves_url_and_uses_session_storage_without_authentication_claims(
        self,
    ) -> None:
        script = (DIST / "js/preview-gate.js").read_text(encoding="utf-8")
        self.assertIn("sessionStorage", script)
        self.assertIn('content.setAttribute("inert", "")', script)
        self.assertIn('content.setAttribute("aria-hidden", "true")', script)
        self.assertIn("dialog.showModal()", script)
        self.assertNotIn("location.href", script)
        self.assertNotIn("location.assign", script)
        self.assertNotIn("history.pushState", script)
        self.assertNotIn("history.replaceState", script)
        self.assertIn("location.hash", script)
        self.assertNotIn("secure authentication", script)
        self.assertIn("queueMicrotask", script)
        self.assertIn("box-sizing: border-box", (DIST / "css/preview-gate.css").read_text())
        self.assertIn(
            "This browser could not clear remembered preview access.",
            script,
        )

    def test_future_exports_do_not_include_preview_gate_assets(self) -> None:
        export_source = (ROOT / "js/export.js").read_text(encoding="utf-8")
        self.assertNotIn('src="js/preview-gate', export_source)
        self.assertNotIn("import", export_source.split("export")[0])
        for name in ("full-guide.html", "guide.html"):
            self.assertNotIn(
                "preview-gate",
                (ROOT / name).read_text(encoding="utf-8"),
            )

    def test_netlify_headers_cover_all_paths_and_future_gcds_host(self) -> None:
        config = (ROOT / "netlify.toml").read_text(encoding="utf-8")
        self.assertIn('for = "/*"', config)
        self.assertIn(
            "X-Robots-Tag = \"noindex, nofollow, noarchive\"",
            config,
        )
        self.assertIn("Content-Security-Policy", config)
        self.assertIn("https://cdn.design-system.canada.ca", config)
        self.assertIn("https://fonts.googleapis.com", config)
        self.assertIn("https://fonts.gstatic.com", config)
        self.assertNotIn("'unsafe-inline'", config)


if __name__ == "__main__":
    unittest.main()
