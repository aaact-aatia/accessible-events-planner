(() => {
  "use strict";

  document.documentElement.classList.add("preview-gate-pending");
  const storageKey = "aep-preview-unlocked-v1";

  document.addEventListener("DOMContentLoaded", () => {
    const config = window.AEP_PREVIEW_GATE_CONFIG;
    const content = document.getElementById("preview-gate-content");
    const dialog = document.querySelector(".preview-gate-dialog");
    const form = document.getElementById("preview-gate-form");
    const password = document.getElementById("preview-gate-password");
    const error = document.getElementById("preview-gate-error");
    const session = document.querySelector(".preview-gate-session");
    const signOut = document.getElementById("preview-gate-sign-out");
    const storageMessage = document.getElementById(
      "preview-gate-storage-message",
    );

    if (!config || !content || !dialog || !form || !password || !error
      || !session || !signOut || !storageMessage) {
      return;
    }

    const encoder = new TextEncoder();
    let storageReadWarning = "";
    let restoreSignOutFocus = false;

    function announceStorageMessage(message) {
      storageMessage.hidden = false;
      queueMicrotask(() => {
        storageMessage.textContent = message;
      });
    }

    function showDialogMessage(message, invalid = false) {
      error.textContent = message;
      error.hidden = false;
      if (invalid) {
        password.setAttribute("aria-invalid", "true");
      } else {
        password.removeAttribute("aria-invalid");
      }
      password.focus();
    }

    function showError(message) {
      showDialogMessage(message, true);
    }

    function setLocked(locked) {
      document.documentElement.classList.toggle(
        "preview-gate-pending",
        locked,
      );
      if (locked) {
        content.setAttribute("inert", "");
        content.setAttribute("aria-hidden", "true");
        session.hidden = true;
        return;
      }
      content.removeAttribute("inert");
      content.removeAttribute("aria-hidden");
      session.hidden = false;
    }

    function storedVerifier() {
      try {
        return sessionStorage.getItem(storageKey);
      } catch {
        storageReadWarning =
          "This browser cannot remember preview access for this tab.";
        return null;
      }
    }

    function rememberUnlock() {
      try {
        sessionStorage.setItem(storageKey, config.verifier);
      } catch {
        announceStorageMessage(
          "Preview access works, but this browser cannot remember it for this tab.",
        );
      }
    }

    function forgetUnlock() {
      try {
        sessionStorage.removeItem(storageKey);
        return true;
      } catch {
        return false;
      }
    }

    async function deriveVerifier(value) {
      if (!globalThis.crypto?.subtle) {
        throw new Error("Web Crypto is unavailable");
      }
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(value),
        "PBKDF2",
        false,
        ["deriveBits"],
      );
      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: encoder.encode(config.salt),
          iterations: config.iterations,
        },
        key,
        256,
      );
      return [...new Uint8Array(bits)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    function focusInitialContent() {
      let target = document.querySelector("main");
      if (location.hash.length > 1) {
        try {
          const hashTarget = document.getElementById(
            decodeURIComponent(location.hash.slice(1)),
          );
          if (hashTarget) target = hashTarget;
        } catch {
          // Keep the main landmark focus target when a fragment cannot be decoded.
        }
      }
      if (!target) return;
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    }

    function unlock({ remember, focus }) {
      setLocked(false);
      if (dialog.open) dialog.close();
      if (remember) rememberUnlock();
      if (focus) {
        if (restoreSignOutFocus) {
          restoreSignOutFocus = false;
          signOut.focus();
        } else {
          focusInitialContent();
        }
      }
    }

    function lock() {
      setLocked(true);
      error.hidden = true;
      error.textContent = "";
      password.removeAttribute("aria-invalid");
      password.value = "";
      if (!dialog.open) dialog.showModal();
      password.focus();
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!password.value) {
        showError("Enter the shared preview password.");
        return;
      }
      try {
        const candidate = await deriveVerifier(password.value);
        if (candidate !== config.verifier) {
          showError("The preview password is incorrect.");
          return;
        }
        password.removeAttribute("aria-invalid");
        unlock({ remember: true, focus: true });
      } catch {
        showError(
          "The preview password cannot be verified in this browser. Use a current browser or leave this preview.",
        );
      }
    });

    password.addEventListener("input", () => {
      password.removeAttribute("aria-invalid");
      error.hidden = true;
      error.textContent = "";
    });

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      password.focus();
    });

    signOut.addEventListener("click", () => {
      restoreSignOutFocus = true;
      const cleared = forgetUnlock();
      lock();
      if (!cleared) {
        showDialogMessage(
          "This browser could not clear remembered preview access. You are locked for this page, but the remembered access may return after reload.",
        );
      }
    });

    if (storedVerifier() === config.verifier) {
      unlock({ remember: false, focus: false });
      return;
    }
    lock();
    if (storageReadWarning) {
      showDialogMessage(storageReadWarning);
    }
  });
})();
