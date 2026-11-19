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

async function waitForNativeControlFocusToLeave() {
  if (!document.activeElement.closest?.(".native-control-fallback")) return;
  await new Promise((resolve) => {
    const finish = () => {
      requestAnimationFrame(() => {
        if (document.activeElement.closest?.(".native-control-fallback")) {
          return;
        }
        document.removeEventListener("focusout", finish);
        resolve();
      });
    };
    document.addEventListener("focusout", finish);
  });
}

async function enhanceGcShell() {
  await Promise.all([
    readyComponents("gcds-header"),
    readyComponents("gcds-footer"),
  ]);
  document.documentElement.classList.add("gcds-shell-ready");
  document.documentElement.classList.remove("gcds-pending");
}

enhanceGcShell().catch((error) => {
  console.error("The GC Design System shell could not be loaded.", error);
});

readyComponents("gcds-button")
  .then(async () => {
    await waitForNativeControlFocusToLeave();
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
