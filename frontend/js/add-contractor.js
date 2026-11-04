(() => {
  const byId = id => document.getElementById(id);
  const modalIds = ['add-contractor-modal', 'organization-modal', 'archive-modal'];
  let editingId = null;
  let archiveId = null;
  let busy = false;
  let epoch = 0;
  const phoneMasks = new Map();
  document.querySelectorAll('.phone-mask').forEach(input => {
    if (window.IMask) phoneMasks.set(input.id, IMask(input, { mask: '+{1} (000) 000-0000', lazy: false }));
  });
  function setPhone(id, value = '') {
    const mask = phoneMasks.get(id);
    if (mask) mask.value = value || '';
    else byId(id).value = value || '';
  }
  function phoneIsComplete(id) {
    const input = byId(id);
    const mask = phoneMasks.get(id);
    const valid = mask ? mask.masked.isComplete : /^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(input.value);
    input.setCustomValidity(valid ? '' : 'Enter a complete US phone number.');
    return valid;
  }
  phoneMasks.forEach((mask, id) => byId(id).addEventListener('input', () => byId(id).setCustomValidity('')));
  function splitName(record) {
    const parts = String(record?.full_name ?? '').trim().split(/\s+/).filter(Boolean);
    return {
      prefix: record?.prefix ?? '', first: record?.first_name ?? parts.shift() ?? '',
      middle: record?.middle_name ?? '', last: record?.last_name ?? parts.pop() ?? '',
      suffix: record?.suffix ?? '',
    };
  }
  function fullName({ prefix, first, middle, last, suffix }) {
    return [prefix, first, middle, last, suffix].map(value => value.trim()).filter(Boolean).join(' ');
  }

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
    const name = splitName(record);
    byId('contractor-prefix').value = name.prefix;
    byId('contractor-first-name').value = name.first;
    byId('contractor-middle-name').value = name.middle;
    byId('contractor-last-name').value = name.last;
    byId('contractor-suffix').value = name.suffix;
    byId('contractor-role').value = record?.role ?? '';
    byId('contractor-email').value = record?.email ?? '';
    setPhone('contractor-phone', record?.phone ?? '');
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
    byId('inline-contractor-fields').hidden = true;
    byId('toggle-inline-contractor').setAttribute('aria-expanded', 'false');
    ['organization-phone', 'organization-secondary-phone', 'inline-contractor-phone'].forEach(id => setPhone(id));
    byId('inline-contractor-fields').querySelectorAll('input, select').forEach(input => { input.required = false; });
    byId('organization-form-message').textContent = '';
    setBusy(false);
  });
  byId('toggle-inline-contractor').addEventListener('click', event => {
    const expanded = byId('toggle-inline-contractor').getAttribute('aria-expanded') !== 'true';
    byId('toggle-inline-contractor').setAttribute('aria-expanded', String(expanded));
    byId('inline-contractor-fields').hidden = !expanded;
    byId('inline-contractor-fields').querySelectorAll('input, select').forEach(input => { input.required = expanded; });
    event.currentTarget.querySelector('i')?.classList.toggle('bi-person-plus', !expanded);
    event.currentTarget.querySelector('i')?.classList.toggle('bi-person-check', expanded);
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
        byId('workspace-message').textContent = `${successMessage} The list could not update automatically; reopen the workspace to reload.`;
      }
    } catch (error) {
      if (!validSession(token)) return;
      if (error.organizationCreated) {
        setBusy(false);
        bootstrap.Modal.getOrCreateInstance(byId(modalId)).hide();
        const refreshed = await window.crmDirectory.refresh();
        if (validSession(token)) byId('workspace-message').textContent = refreshed
          ? `Organization saved, but its inline contractor could not be created: ${error.message}`
          : `Organization saved, but its inline contractor could not be created: ${error.message} Reopen the workspace to reload.`;
        return;
      }
      byId(messageId).textContent = error.message;
      if (error.message === 'Login required') await window.crmSession.lock('Session expired. Log in again.');
    } finally {
      if (token === epoch) setBusy(false);
    }
  }
  byId('add-contractor-form').addEventListener('submit', event => {
    event.preventDefault();
    if (busy) return;
    if (!phoneIsComplete('contractor-phone') || !event.currentTarget.reportValidity()) return;
    if (!window.confirm('Confirm save this contractor?')) return;
    const createdAt = new Date().toISOString();
    const split = { prefix: byId('contractor-prefix').value, first: byId('contractor-first-name').value, middle: byId('contractor-middle-name').value, last: byId('contractor-last-name').value, suffix: byId('contractor-suffix').value };
    const sprint2Payload = {
      ...split, full_name: fullName(split), organization_id: Number(byId('contractor-organization').value),
      role: byId('contractor-role').value || null,
      email: byId('contractor-email').value.trim(),
      phone: byId('contractor-phone').value,
      headshot_filename: byId('contractor-headshot').files[0]?.name ?? null,
      created_at: createdAt,
    };
    console.log('Sprint 2 contractor save payload:', JSON.stringify(sprint2Payload));
    const profile = { full_name: sprint2Payload.full_name, role: sprint2Payload.role, email: sprint2Payload.email, phone: sprint2Payload.phone };
    const id = editingId;
    const request = id === null ? { organization_id: sprint2Payload.organization_id, profile } : { id, profile };
    mutate('add-contractor-modal', 'contractor-form-message',
      () => id === null ? window.crmApi.createContractor(request) : window.crmApi.updateContractor(request),
      saved => window.crmDirectory.showProfile(saved.id), 'Contractor saved.');
  });
  byId('organization-form').addEventListener('submit', event => {
    event.preventDefault();
    if (busy || !window.crmSession?.authenticated) return;
    const inlineOpen = !byId('inline-contractor-fields').hidden;
    if ((inlineOpen && !phoneIsComplete('inline-contractor-phone')) || !event.currentTarget.reportValidity()) return;
    if (!window.confirm('Confirm save this organization?')) return;
    const createdAt = new Date().toISOString();
    const extraContact = {
      prefix: '', first: byId('inline-contractor-first-name').value.trim(), middle: '',
      last: byId('inline-contractor-last-name').value.trim(), suffix: '',
    };
    const sprint2Payload = {
      name: byId('organization-name').value.trim(), region: byId('organization-region').value.trim() || null,
      phone: byId('organization-phone').value || null,
      secondary_phone: byId('organization-secondary-phone').value || null,
      secondary_contact: byId('organization-secondary-contact').value.trim() || null,
      secondary_email: byId('organization-secondary-email').value.trim() || null,
      notes: byId('organization-notes').value.trim() || null,
      logo_filename: byId('organization-logo').files[0]?.name ?? null,
      created_at: createdAt,
      contractor: inlineOpen ? {
        full_name: fullName(extraContact), role: byId('inline-contractor-role').value,
        email: byId('inline-contractor-email').value.trim(), phone: byId('inline-contractor-phone').value,
      } : null,
    };
    console.log('Sprint 2 organization save payload:', JSON.stringify(sprint2Payload));
    const request = { name: sprint2Payload.name, region: sprint2Payload.region };
    mutate('organization-modal', 'organization-form-message', async () => {
      const organization = await window.crmApi.createOrganization(request);
      if (sprint2Payload.contractor) {
        const profile = { full_name: sprint2Payload.contractor.full_name, role: sprint2Payload.contractor.role, email: sprint2Payload.contractor.email, phone: sprint2Payload.contractor.phone };
        console.log('Sprint 2 inline contractor payload:', JSON.stringify({ ...sprint2Payload.contractor, organization_id: organization.id, created_at: createdAt }));
        try {
          await window.crmApi.createContractor({ organization_id: organization.id, profile });
        } catch (error) {
          error.organizationCreated = organization;
          throw error;
        }
      }
      return organization;
    }, () => byId('nav-organizations').click(), 'Organization saved.');
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
