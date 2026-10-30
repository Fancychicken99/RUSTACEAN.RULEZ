(() => {
  const byId = id => document.getElementById(id);
  const modalIds = ['add-contractor-modal', 'organization-modal', 'archive-modal'];
  let editingId = null;
  let archiveId = null;
  let busy = false;
  let epoch = 0;

  function validSession(token) { return token === epoch && window.crmSession?.authenticated; }
  function availability() {
    byId('contractor-organization').disabled = editingId !== null;
    byId('save-contractor').disabled = busy || (editingId === null && window.crmDirectory.organizations.length === 0);
  }
  function setBusy(value) {
    busy = value;
    byId('contractor-fields').disabled = value;
    byId('organization-fields').disabled = value;
    modalIds.forEach(id => byId(id).querySelectorAll('button').forEach(button => { button.disabled = value; }));
    availability();
  }
  function organizationOptions(record) {
    const select = byId('contractor-organization');
    select.replaceChildren(new Option('Select an organization', ''));
    const organizations = window.crmDirectory.organizations;
    organizations.forEach(org => select.add(new Option(`${org.name} · ${org.region ?? 'No region'} (#${org.id})`, String(org.id))));
    if (record) {
      if (record.organization_id != null && !organizations.some(org => org.id === record.organization_id)) {
        select.add(new Option(record.organization_name ?? 'Archived organization', String(record.organization_id)));
      }
      select.value = record.organization_id == null ? '' : String(record.organization_id);
    }
  }
  function prepareContractor(record = null) {
    if (!window.crmSession?.authenticated) return;
    ++epoch;
    byId('add-contractor-form').reset();
    editingId = record?.id ?? null;
    byId('add-contractor-title').textContent = record ? 'Edit contractor' : 'Add contractor';
    byId('contractor-full-name').value = record?.full_name ?? '';
    byId('contractor-role').value = record?.role ?? '';
    byId('contractor-email').value = record?.email ?? '';
    byId('contractor-phone').value = record?.phone ?? '';
    organizationOptions(record);
    byId('organization-help').textContent = record ? 'Organization transfers are a separate workflow; this editor preserves the current organization.' : 'Region comes from the selected organization.';
    byId('contractor-form-message').textContent = !record && window.crmDirectory.organizations.length === 0
      ? 'Create an organization from Organizations before adding a contractor.' : '';
    setBusy(false);
  }
  const contractorModal = byId('add-contractor-modal');
  contractorModal.addEventListener('show.bs.modal', event => {
    if (!window.crmSession?.authenticated) { event.preventDefault(); return; }
    // Programmatic edit preparation has no relatedTarget; add buttons do.
    if (event.relatedTarget) prepareContractor();
  });
  window.addEventListener('crm:edit-contractor', event => {
    if (!window.crmSession?.authenticated || busy) return;
    prepareContractor(event.detail);
    bootstrap.Modal.getOrCreateInstance(contractorModal).show();
  });
  window.addEventListener('crm:archive-contractor', event => {
    if (!window.crmSession?.authenticated || busy) return;
    ++epoch;
    archiveId = event.detail.id;
    byId('archive-name').textContent = event.detail.full_name;
    byId('archive-form-message').textContent = '';
    setBusy(false);
    bootstrap.Modal.getOrCreateInstance(byId('archive-modal')).show();
  });
  byId('organization-modal').addEventListener('show.bs.modal', event => {
    if (!window.crmSession?.authenticated || busy) { event.preventDefault(); return; }
    ++epoch;
    byId('organization-form').reset();
    byId('organization-form-message').textContent = '';
    setBusy(false);
  });
  modalIds.forEach(id => {
    byId(id).addEventListener('show.bs.modal', () => { byId(id).inert = !window.crmSession?.authenticated; });
    byId(id).addEventListener('shown.bs.modal', () => {
      if (!window.crmSession?.authenticated) {
        document.activeElement?.blur();
        bootstrap.Modal.getInstance(byId(id))?.hide();
      }
    });
    byId(id).addEventListener('hide.bs.modal', event => { if (busy) event.preventDefault(); });
    byId(id).addEventListener('hidden.bs.modal', () => {
      byId(id).querySelector('form').reset();
      byId(id).querySelectorAll('[role="status"]').forEach(element => { element.textContent = ''; });
      if (id === 'archive-modal') byId('archive-name').textContent = '';
    });
  });

  async function mutate(modalId, messageId, operation, afterSave, successMessage) {
    if (busy || !window.crmSession?.authenticated) return;
    const token = epoch;
    setBusy(true);
    byId(messageId).textContent = 'Saving…';
    try {
      const saved = await operation();
      if (!validSession(token)) return;
      setBusy(false);
      document.activeElement?.blur();
      bootstrap.Modal.getOrCreateInstance(byId(modalId)).hide();
      if (modalId === 'archive-modal') window.history.replaceState(null, '', '#/contacts');
      const refreshed = await window.crmDirectory.refresh();
      if (!validSession(token)) return;
      if (refreshed) {
        afterSave(saved);
        byId('workspace-message').textContent = successMessage;
      } else {
        byId('workspace-message').textContent = `${successMessage} Could not refresh the directory. Use Refresh; do not resubmit.`;
      }
    } catch (error) {
      if (!validSession(token)) return;
      byId(messageId).textContent = error.message;
      if (error.message === 'Login required') await window.crmSession.lock('Session expired. Log in again.');
    } finally {
      if (token === epoch) setBusy(false);
    }
  }
  byId('add-contractor-form').addEventListener('submit', event => {
    event.preventDefault();
    if (busy) return;
    const profile = {
      full_name: byId('contractor-full-name').value,
      role: byId('contractor-role').value || null,
      email: byId('contractor-email').value || null,
      phone: byId('contractor-phone').value || null,
    };
    const id = editingId;
    const request = id === null ? { organization_id: Number(byId('contractor-organization').value), profile } : { id, profile };
    mutate('add-contractor-modal', 'contractor-form-message',
      () => id === null ? window.crmApi.createContractor(request) : window.crmApi.updateContractor(request),
      saved => window.crmDirectory.showProfile(saved.id), 'Contractor saved.');
  });
  byId('organization-form').addEventListener('submit', event => {
    event.preventDefault();
    const request = { name: byId('organization-name').value, region: byId('organization-region').value || null };
    mutate('organization-modal', 'organization-form-message', () => window.crmApi.createOrganization(request),
      () => byId('nav-organizations').click(), 'Organization saved.');
  });
  byId('archive-form').addEventListener('submit', event => {
    event.preventDefault();
    const request = { id: archiveId };
    mutate('archive-modal', 'archive-form-message', () => window.crmApi.archiveContractor(request),
      () => byId('nav-contacts').click(), 'Contractor archived. The record is retained.');
  });
  window.addEventListener('crm:locked', () => {
    ++epoch;
    editingId = null;
    archiveId = null;
    setBusy(false);
    modalIds.forEach(id => {
      const modal = byId(id);
      modal.inert = true;
      modal.querySelector('form').reset();
      modal.querySelectorAll('[role="status"]').forEach(element => { element.textContent = ''; });
      bootstrap.Modal.getInstance(modal)?.hide();
    });
    byId('archive-name').textContent = '';
    byId('contractor-organization').replaceChildren();
  });
})();
