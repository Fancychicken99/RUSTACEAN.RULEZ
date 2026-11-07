(() => {
  const notification = document.getElementById('workspace-notification');
  const notificationText = document.getElementById('workspace-message');
  let notificationTimer;
  let notificationGeneration = 0;
  let transient = false;
  function scheduleDismiss() {
    clearTimeout(notificationTimer);
    if (!transient || notification.matches(':hover, :focus-within')) return;
    const generation = notificationGeneration;
    notificationTimer = setTimeout(() => {
      notification.classList.add('notification-leaving');
      notificationTimer = setTimeout(() => {
        if (generation === notificationGeneration) window.crmNotify('');
      }, 200);
    }, 6000);
  }
  window.crmNotify = (text, kind = 'success') => {
    ++notificationGeneration;
    clearTimeout(notificationTimer);
    notification.classList.remove('notification-leaving');
    notification.hidden = !text;
    notification.dataset.kind = kind;
    notificationText.textContent = text;
    transient = kind === 'success';
    scheduleDismiss();
  };
  notification.addEventListener('mouseenter', () => { clearTimeout(notificationTimer); notification.classList.remove('notification-leaving'); });
  notification.addEventListener('focusin', () => { clearTimeout(notificationTimer); notification.classList.remove('notification-leaving'); });
  notification.addEventListener('mouseleave', scheduleDismiss);
  notification.addEventListener('focusout', () => setTimeout(scheduleDismiss, 0));
  document.getElementById('dismiss-notification').addEventListener('click', () => window.crmNotify(''));
  window.addEventListener('crm:locked', () => window.crmNotify(''));

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

  window.crmDestroyTable = table => {
    if (!table || !window.DataTable?.isDataTable(table)) return;
    const api = new DataTable(table);
    if (table.dataset.resetOrder) delete table.dataset.manualOrder;
    else { const order = api.order(); if (order.length) table.dataset.manualOrder = JSON.stringify(order); }
    api.destroy();
  };
  window.crmDataTable = function crmDataTable(table) {
    if (!table || !window.DataTable) return;
    window.crmDestroyTable(table);
    if (table.querySelectorAll('tbody tr').length && !table.querySelector('tbody td[colspan]')) {
      let order = []; try { if (!table.dataset.resetOrder) order = JSON.parse(table.dataset.manualOrder || '[]'); } catch {}
      delete table.dataset.resetOrder;
      new DataTable(table, { order, pageLength: 10, lengthChange: true, ordering: true, searching: false, autoWidth: false });
    }
  };
  window.addEventListener('crm:locked', () => {
    document.querySelectorAll('table').forEach(table => {
      if (window.DataTable?.isDataTable(table)) {
        const api = new DataTable(table);
        api.clear();
        api.destroy();
        table.querySelector('tbody')?.replaceChildren();
      }
    });
  });

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
