// Apply before paint; one source of truth for system and explicit theme choices.
(() => {
  const key = 'hippo-harbor-theme-mode';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let mode = 'system';
  try { const saved = localStorage.getItem(key); if (['system', 'light', 'dark'].includes(saved)) mode = saved; } catch {}
  function apply() {
    const theme = mode === 'system' ? (system.matches ? 'dark' : 'light') : mode;
    document.documentElement.dataset.bsTheme = theme;
    document.body?.setAttribute('data-bs-theme', theme);
    window.dispatchEvent(new CustomEvent('crm:theme', { detail: { mode, theme } }));
  }
  window.crmTheme = Object.freeze({
    get mode() { return mode; },
    setMode(value) {
      if (!['system', 'light', 'dark'].includes(value)) return;
      mode = value;
      try { localStorage.setItem(key, mode); } catch {}
      apply();
    },
    apply,
  });
  system.addEventListener('change', () => { if (mode === 'system') apply(); });
  apply();
})();
