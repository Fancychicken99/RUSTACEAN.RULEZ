(() => {
  const root = document.documentElement;
  const storedTheme = (() => { try { return localStorage.getItem('northstar-crm-theme'); } catch { return null; } })();

  window.applyTimeBasedTheme = function applyTimeBasedTheme() {
    const hour = new Date().getHours();
    const darkByClock = hour >= 18 || hour < 6;
    const theme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : (darkByClock ? 'dark' : 'light');
    root.dataset.bsTheme = theme;
    document.body?.setAttribute('data-bs-theme', theme);
    return theme;
  };
  window.applyTimeBasedTheme();

  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  toggle?.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    sidebar?.classList.toggle('sidebar-collapsed', expanded);
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.setAttribute('aria-label', expanded ? 'Expand sidebar' : 'Collapse sidebar');
    toggle.title = expanded ? 'Expand sidebar' : 'Collapse sidebar';
    toggle.querySelector('i')?.classList.replace(expanded ? 'bi-chevron-left' : 'bi-chevron-right', expanded ? 'bi-chevron-right' : 'bi-chevron-left');
  });

  window.crmDataTable = function crmDataTable(table) {
    if (!table || !window.DataTable) return;
    if (DataTable.isDataTable(table)) new DataTable(table).destroy();
    if (table.querySelectorAll('tbody tr').length && !table.querySelector('tbody td[colspan]')) {
      new DataTable(table, { pageLength: 10, lengthChange: true, ordering: true, searching: false, autoWidth: false });
    }
  };

  const buttonIcons = [
    [/^(add|save|import)/i, 'bi-plus-circle'], [/^(apply|filter)/i, 'bi-funnel'],
    [/^(clear|cancel|close)/i, 'bi-x-circle'], [/^(refresh|retry)/i, 'bi-arrow-clockwise'],
    [/^(archive|delete)/i, 'bi-archive'], [/^(view roster)/i, 'bi-people'],
    [/^(log in|create password)/i, 'bi-unlock'], [/^(lock)/i, 'bi-lock'],
  ];
  function decorateButtons(container = document) {
    const buttons = [...(container.matches?.('button:not(.btn-close)') ? [container] : []), ...container.querySelectorAll('button:not(.btn-close)')];
    buttons.forEach(button => {
      if (button.querySelector('.bi')) return;
      const label = button.textContent.trim();
      const match = buttonIcons.find(([pattern]) => pattern.test(label));
      if (!match) return;
      const icon = document.createElement('i');
      icon.className = `bi ${match[1]} me-1`;
      icon.setAttribute('aria-hidden', 'true');
      button.prepend(icon);
    });
  }
  decorateButtons();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) decorateButtons(node);
  }))).observe(document.body, { childList: true, subtree: true });
})();
