(() => {
  const toggle = document.getElementById('theme-toggle');
  const select = document.getElementById('theme-mode');
  function reflect() {
    const dark = document.documentElement.dataset.bsTheme === 'dark';
    const next = dark ? 'light' : 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', 'Switch to ' + next + ' mode');
    toggle.title = 'Switch to ' + next + ' mode';
    document.getElementById('theme-toggle-label').textContent = dark ? 'Light mode' : 'Dark mode';
    document.getElementById('theme-toggle-icon').className = 'bi ' + (dark ? 'bi-sun' : 'bi-moon-stars');
    select.value = window.crmTheme.mode;
  }
  toggle.addEventListener('click', () => window.crmTheme.setMode(document.documentElement.dataset.bsTheme === 'dark' ? 'light' : 'dark'));
  select.addEventListener('change', event => window.crmTheme.setMode(event.target.value));
  window.addEventListener('crm:theme', reflect);
  window.crmTheme.apply();
  reflect();
})();
