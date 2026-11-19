async function readyComponents(tagName) {
  const hosts = [...document.querySelectorAll(tagName)];
  if (!hosts.length) return;
  await customElements.whenDefined(tagName);
  await Promise.all(hosts.map(async (host) => {
    if (typeof host.componentOnReady === "function") {
      await host.componentOnReady();
    }
  }));
}

async function waitForNativeFocusToLeave(selector) {
  if (!document.activeElement.closest?.(selector)) return;
  await new Promise((resolve) => {
    const finish = () => {
      queueMicrotask(() => {
        if (document.activeElement.closest?.(selector)) {
          return;
        }
        document.removeEventListener("focusin", finish);
        document.removeEventListener("focusout", finish);
        resolve();
      });
    };
    document.addEventListener("focusin", finish);
    document.addEventListener("focusout", finish);
  });
}

async function preserveShellFocus() {
  const fallback = document.activeElement.closest?.(".native-shell-fallback");
  if (!fallback) return;
  const href = fallback.getAttribute?.("href");
  const enhanced = href
    ? document.querySelector("gcds-header")
      ?.shadowRoot?.querySelector(`a[href="${href}"]`)
    : null;
  if (enhanced) {
    document.documentElement.classList.add("gcds-shell-visible");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    enhanced.focus();
    return;
  }
  await waitForNativeFocusToLeave(".native-shell-fallback");
}

async function enhanceGcShell() {
  await Promise.all([
    readyComponents("gcds-header"),
    readyComponents("gcds-footer"),
  ]);
  await preserveShellFocus();
  document.documentElement.classList.add("gcds-shell-ready");
  document.documentElement.classList.remove("gcds-shell-visible");
  document.documentElement.classList.remove("gcds-pending");
}

enhanceGcShell().catch((error) => {
  console.error("The GC Design System shell could not be loaded.", error);
});

readyComponents("gcds-button")
  .then(async () => {
    await waitForNativeFocusToLeave(".native-control-fallback");
    document.documentElement.classList.add("gcds-controls-ready");
  })
  .catch((error) => {
    console.error("The GC Design System buttons could not be loaded.", error);
  });

readyComponents("gcds-error-summary")
  .then(() => {
    document.documentElement.classList.add("gcds-errors-ready");
  })
  .catch((error) => {
    console.error("The GC Design System error summary could not be loaded.", error);
  });
