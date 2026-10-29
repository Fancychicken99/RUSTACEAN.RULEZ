(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  if (!toggle || !icon || !label) return;

  function applyTheme(theme, persist = true) {
    const isDark = theme === 'dark';
    root.dataset.bsTheme = isDark ? 'dark' : 'light';
    toggle.setAttribute('aria-pressed', String(isDark));
    const nextTheme = isDark ? 'light' : 'dark';
    const actionLabel = `Switch to ${nextTheme} mode`;
    toggle.setAttribute('aria-label', actionLabel);
    toggle.title = actionLabel;
    label.textContent = `${nextTheme[0].toUpperCase()}${nextTheme.slice(1)} mode`;
    icon.className = `bi ${isDark ? 'bi-sun' : 'bi-moon-stars'}`;

    if (persist) {
      try {
        localStorage.setItem('northstar-crm-theme', isDark ? 'dark' : 'light');
      } catch {
        // The theme still applies for this session when storage is unavailable.
      }
    }
  }

  applyTheme(root.dataset.bsTheme, false);
  toggle.addEventListener('click', () => {
    applyTheme(root.dataset.bsTheme === 'dark' ? 'light' : 'dark');
  });
})();
