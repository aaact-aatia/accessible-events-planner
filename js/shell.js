async function enhanceGcShell() {
  await Promise.all([
    customElements.whenDefined("gcds-header"),
    customElements.whenDefined("gcds-footer"),
  ]);
  document.documentElement.classList.add("gcds-ready");
  document.documentElement.classList.remove("gcds-pending");
}

enhanceGcShell().catch((error) => {
  console.error("The GC Design System shell could not be loaded.", error);
});
