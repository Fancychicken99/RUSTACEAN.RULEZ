(() => {
  let generation = 0;
  window.crmMedia = Object.freeze({
    async loadInto(image, kind, id, placeholder) {
      const token = generation;
      try {
        const data = await window.crmApi.loadRecordImage({ kind, id });
        if (token !== generation || !window.crmSession?.authenticated || !image.isConnected) return;
        if (data) { image.src = data; image.hidden = false; if (placeholder) placeholder.hidden = true; }
      } catch (error) {
        if (token === generation && placeholder) { placeholder.title = error.message; }
      }
    },
  });
  function loadOrganizationImages() {
    for (const row of document.querySelectorAll('[data-organization-id]')) {
      if (row.querySelector('[data-saved-logo]')) continue;
      const cell = row.querySelector('td, th'); if (!cell) continue;
      const image = document.createElement('img'); image.dataset.savedLogo = ''; image.alt = 'Organization logo'; image.width = 40; image.height = 40; image.className = 'saved-organization-logo me-2'; image.hidden = true;
      cell.prepend(image); window.crmMedia.loadInto(image, 'organization', Number(row.dataset.organizationId));
    }
  }
  window.addEventListener('crm:taxonomy-loaded', () => setTimeout(loadOrganizationImages, 0));
  window.addEventListener('crm:records-loaded', () => setTimeout(loadOrganizationImages, 0));
  window.addEventListener('crm:locked', () => { ++generation; document.querySelectorAll('[data-saved-logo]').forEach(image => image.remove()); });
})();
