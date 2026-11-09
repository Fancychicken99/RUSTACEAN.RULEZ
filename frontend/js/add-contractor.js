(() => {
  const byId = id => document.getElementById(id);
  const modalIds = ['add-contractor-modal', 'organization-modal', 'archive-modal'];
  let editingId = null;
  let editingOrganizationId = null;
  let archiveId = null;
  let busy = false;
  let epoch = 0;
  let legacyNameMode = false;
  function setPhone(id, value = '') {
    byId(id).value = value || '';
  }
  async function imagePayload(file) {
    if (!file) return null;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Choose a PNG or JPEG image up to 8 MiB');
    return { bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
  }
  function phoneIsValid(value) {
    const digits = value.replace(/[^0-9]/g, '').length;
    if (digits < 7 || digits > 15 || !/^\+?[0-9 ()-]+$/.test(value) || (value.startsWith('+') && !/^\+[1-9]/.test(value))) return false;
    let depth = 0;
    for (const ch of value) {
      if (ch === '(') { if (depth !== 0) return false; depth = 1; }
      if (ch === ')') { if (depth !== 1) return false; depth = 0; }
    }
    return depth === 0;
  }
  function clearContactValidity(prefix) {
    byId(`${prefix}-email`).setCustomValidity('');
    byId(`${prefix}-phone`).setCustomValidity('');
  }
  function validateContact(prefix, messageId) {
    clearContactValidity(prefix);
    const email = byId(`${prefix}-email`), phone = byId(`${prefix}-phone`);
    let message = '';
    if (!email.value.trim() && !phone.value.trim()) {
      message = 'Enter a phone number or email address';
      email.setCustomValidity(message);
    } else if (phone.value.trim() && !phoneIsValid(phone.value.trim())) {
      message = 'Enter a phone number with 7 to 15 digits; use an optional leading +, spaces, hyphens or balanced parentheses';
      phone.setCustomValidity(message);
    }
    if (message) byId(messageId).textContent = message;
    return !message;
  }
  function reportFormValidity(form) {
    const invalid = [...form.elements].find(input => input.willValidate && !input.validity.valid);
    if (!invalid) return true;
    form.querySelector('[role="status"]').textContent = invalid.validationMessage;
    const pane = invalid.closest('.tab-pane');
    if (pane && !pane.classList.contains('active')) {
      const tab = form.querySelector(`[data-bs-target="#${pane.id}"]`);
      tab.addEventListener('shown.bs.tab', () => invalid.reportValidity(), { once: true });
      bootstrap.Tab.getOrCreateInstance(tab).show();
    } else invalid.reportValidity();
    return false;
  }
  ['contractor', 'inline-contractor'].forEach(prefix => {
    ['email', 'phone'].forEach(field => byId(`${prefix}-${field}`).addEventListener('input', () => clearContactValidity(prefix)));
  });
  function splitName(record) {
    return {
      prefix: record?.prefix ?? '', first: record?.first_name ?? '',
      middle: record?.middle_name ?? '', last: record?.last_name ?? '',
      suffix: record?.suffix ?? '',
    };
  }
  function setSavedSelection(id, value) {
    const select = byId(id);
    select.querySelectorAll('[data-existing-profile-choice]').forEach(option => option.remove());
    if (value && ![...select.options].some(option => option.value === value)) {
      const option = new Option(value, value);
      option.dataset.existingProfileChoice = '';
      select.add(option);
    }
    select.value = value;
  }
  function setNameMode(legacy) {
    legacyNameMode = legacy;
    byId('contractor-legacy-name-group').hidden = !legacy;
    byId('contractor-legacy-name').disabled = !legacy;
    byId('contractor-legacy-name').required = legacy;
    ['prefix', 'first-name', 'middle-name', 'last-name', 'suffix'].forEach(part => {
      const input = byId(`contractor-${part}`);
      input.disabled = legacy;
      input.parentElement.hidden = legacy;
    });
    byId('contractor-first-name').required = !legacy;
    byId('contractor-last-name').required = !legacy;
  }
  byId('contractor-use-name-parts').addEventListener('click', () => {
    ['prefix', 'first-name', 'middle-name', 'last-name', 'suffix'].forEach(part => { byId(`contractor-${part}`).value = ''; });
    setNameMode(false);
    byId('contractor-first-name').focus();
  });
  function fullName({ prefix, first, middle, last, suffix }) {
    return [prefix, first, middle, last, suffix].map(value => value.trim()).filter(Boolean).join(' ');
  }
  let expandedLongTextSource = null;
  function clearExpandedLongText() {
    expandedLongTextSource = null;
    const dialog = document.getElementById('custom-long-text-dialog');
    if (!dialog) return;
    dialog.querySelector('[data-expanded-long-text]').value = '';
    if (dialog.open) dialog.close();
  }
  window.addEventListener('crm:locked', clearExpandedLongText);
  document.addEventListener('hidden.bs.modal', event => {
    if (expandedLongTextSource && event.target.contains(expandedLongTextSource)) clearExpandedLongText();
  });
  function openExpandedLongText(source, fieldName) {
    let dialog = document.getElementById('custom-long-text-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'custom-long-text-dialog';
      dialog.className = 'long-text-dialog';
      dialog.setAttribute('aria-labelledby', 'custom-long-text-title');
      dialog.innerHTML = `
        <div class="long-text-dialog-content">
          <div class="long-text-dialog-header">
            <div><h2 class="h5 mb-1" id="custom-long-text-title"></h2><p class="text-secondary small mb-0">Changes are saved to the form draft as you type.</p></div>
            <button type="button" class="btn-close" data-close-long-text aria-label="Close expanded text"></button>
          </div>
          <textarea class="form-control" data-expanded-long-text maxlength="5000"></textarea>
          <div class="long-text-dialog-footer"><span class="text-secondary small">Up to 5,000 characters</span><button type="button" class="btn btn-primary" data-close-long-text>Done</button></div>
        </div>`;
      document.body.appendChild(dialog);
      const editor = dialog.querySelector('[data-expanded-long-text]');
      dialog.addEventListener('input', event => {
        if (event.target !== editor || !expandedLongTextSource) return;
        expandedLongTextSource.value = editor.value;
        expandedLongTextSource.dispatchEvent(new Event('input', { bubbles: true }));
      });
      dialog.querySelectorAll('[data-close-long-text]').forEach(button => button.addEventListener('click', () => dialog.close()));
      dialog.addEventListener('close', () => {
        const sourceToRestore = expandedLongTextSource;
        expandedLongTextSource = null;
        editor.value = '';
        if (window.crmSession?.authenticated) sourceToRestore?.focus();
      });
      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
    }
    const editor = dialog.querySelector('[data-expanded-long-text]');
    expandedLongTextSource = source;
    dialog.querySelector('#custom-long-text-title').textContent = fieldName || 'Long text';
    editor.setAttribute('aria-label', `${fieldName || 'Long text'} expanded editor`);
    editor.value = source.value;
    dialog.showModal();
    requestAnimationFrame(() => editor.focus());
  }
  function customFieldValueControl(row, type, saved = {}) {
    const holder = row.querySelector('[data-custom-field-control]');
    holder.replaceChildren();
    const value = saved.value ?? (typeof saved === 'string' ? saved : '');
    if (type === 'long_text') {
      const input = document.createElement('textarea'); input.className = 'form-control'; input.rows = 3;
      input.placeholder = 'Enter additional details'; input.maxLength = 5000; input.dataset.customFieldValue = ''; input.value = value; holder.appendChild(input);
      const expand = document.createElement('button'); expand.type = 'button'; expand.className = 'btn btn-sm btn-outline-secondary mt-2'; expand.textContent = 'Expand text';
      expand.setAttribute('aria-label', 'Expand text in a larger editor');
      expand.addEventListener('click', () => openExpandedLongText(input, row.querySelector('[data-custom-field-name]')?.value.trim()));
      holder.appendChild(expand);
    } else if (type === 'relation') {
      const wrap = document.createElement('div'); wrap.className = 'd-flex gap-2';
      const entity = document.createElement('select'); entity.className = 'form-select'; entity.dataset.customFieldEntity = '';
      entity.setAttribute('aria-label', 'Related record type');
      [['contractor','Contractor'],['organization','Organization']].forEach(([v,l]) => entity.add(new Option(l,v)));
      entity.value = saved.entity_type || 'contractor';
      const target = document.createElement('select'); target.className = 'form-select'; target.dataset.customFieldValue = '';
      target.setAttribute('aria-label', 'Related record');
      const refresh = () => {
        const records = entity.value === 'organization' ? window.crmDirectory.organizations : window.crmDirectory.contractors;
        target.replaceChildren(new Option('Select related record', ''));
        (records || []).forEach(record => target.add(new Option(record.full_name || record.name || `Record #${record.id}`, String(record.id))));
        if (saved.entity_id != null && ![...target.options].some(option => option.value === String(saved.entity_id))) {
          target.add(new Option(`Archived ${entity.value} #${saved.entity_id}`, String(saved.entity_id)));
        }
        target.value = saved.entity_id == null ? '' : String(saved.entity_id);
      };
      entity.addEventListener('change', () => { saved = {}; refresh(); });
      refresh(); wrap.append(entity, target); holder.appendChild(wrap);
    } else {
      const input = document.createElement('input'); input.className = 'form-control'; input.type = 'text';
      input.placeholder = 'Enter a value'; input.maxLength = 500; input.dataset.customFieldValue = ''; input.value = value; holder.appendChild(input);
    }
  }
  function addCustomFieldRow(kind, name = '', saved = '') {
    const list = document.querySelector(`[data-custom-fields="${kind}"]`);
    if (!list) return null;
    const row = document.createElement('div'); row.className = 'row g-3 align-items-stretch mb-4 custom-field-row';
    const nameColumn = document.createElement('div'); nameColumn.className = 'col-xl-3';
    const nameLabel = document.createElement('label'); nameLabel.className = 'form-label'; nameLabel.textContent = 'Field Name';
    const nameInput = document.createElement('input'); nameInput.className = 'form-control'; nameInput.type = 'text'; nameInput.dataset.customFieldName = ''; nameInput.placeholder = 'e.g., Callsign'; nameInput.value = name;
    nameInput.maxLength = 80;
    nameLabel.appendChild(nameInput); nameColumn.appendChild(nameLabel);
    const typeColumn = document.createElement('div'); typeColumn.className = 'col-xl-3';
    const typeLabel = document.createElement('label'); typeLabel.className = 'form-label'; typeLabel.textContent = 'Field Type';
    const typeSelect = document.createElement('select'); typeSelect.className = 'form-select'; typeSelect.dataset.customFieldType = '';
    [['text','Short text'],['long_text','Long text / Description'],['relation','Relation']].forEach(([v,l]) => typeSelect.add(new Option(l,v)));
    typeSelect.value = typeof saved === 'object' && saved?.type ? saved.type : 'text'; typeLabel.appendChild(typeSelect); typeColumn.appendChild(typeLabel);
    const valueColumn = document.createElement('div'); valueColumn.className = typeSelect.value === 'long_text' ? 'col-12' : 'col-xl-4';
    const valueLabel = document.createElement('label'); valueLabel.className = 'form-label'; valueLabel.textContent = typeSelect.value === 'long_text' ? 'Description' : 'Field Value';
    const holder = document.createElement('div'); holder.dataset.customFieldControl = ''; valueLabel.appendChild(holder); valueColumn.appendChild(valueLabel);
    typeSelect.addEventListener('change', () => customFieldValueControl(row, typeSelect.value));
    const actionColumn = document.createElement('div'); actionColumn.className = 'col-xl-2 d-flex align-items-end custom-field-actions';
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-outline-secondary w-100 text-nowrap'; remove.textContent = 'Remove'; remove.addEventListener('click', () => row.remove());
    actionColumn.appendChild(remove); row.append(nameColumn, typeColumn, valueColumn, actionColumn); list.appendChild(row);
    customFieldValueControl(row, typeSelect.value, saved);
  }
  function customFields(kind) {
    const rows = [...document.querySelectorAll(`[data-custom-fields="${kind}"] .custom-field-row`)];
    if (rows.length > 30) throw new Error('Use at most 30 custom fields');
    return rows.reduce((result, row) => {
      const name = row.querySelector('[data-custom-field-name]').value.trim();
      const control = row.querySelector('[data-custom-field-value]');
      const type = row.querySelector('[data-custom-field-type]').value;
      const value = control.value.trim();
      if (!name && !value) return result;
      if (!name || !value) throw new Error('Each custom field needs a name and value');
      if (Object.hasOwn(result, name)) throw new Error('Custom field names must be unique');
      if (['__proto__', 'prototype', 'constructor'].includes(name)) throw new Error('Choose a different custom field name');
      if (name && value) result[name] = type === 'relation'
        ? { type, entity_type: row.querySelector('[data-custom-field-entity]').value, entity_id: Number(value) }
        : { type, value };
      return result;
    }, Object.create(null));
  }
  function captureDetails(kind, messageId) {
    try {
      return {
        address: Object.fromEntries(['street_address_1', 'street_address_2', 'city', 'state_province', 'country'].map(field => {
          const suffix = ({ street_address_1: 'street1', street_address_2: 'street2', state_province: 'state' })[field] ?? field;
          return [field, byId(`${kind}-${suffix}`).value.trim() || null];
        })),
        extra_information: customFields(kind),
      };
    } catch (error) {
      byId(messageId).textContent = error.message;
      const form = byId(kind === 'contractor' ? 'add-contractor-form' : 'organization-form');
      const pane = form.querySelector('[data-custom-fields]')?.closest('.tab-pane');
      if (pane) bootstrap.Tab.getOrCreateInstance(document.querySelector(`[data-bs-target="#${pane.id}"]`)).show();
      return null;
    }
  }
  ['contractor', 'organization'].forEach(kind => {
    ['street1', 'street2', 'city', 'state', 'country'].forEach(field => {
      byId(`${kind}-${field}`).maxLength = field.startsWith('street') ? 200 : 100;
    });
  });
  byId('organization-secondary-contact').maxLength = 200;
  byId('organization-secondary-email').maxLength = 254;
  byId('organization-secondary-phone').addEventListener('input', event => event.target.setCustomValidity(''));
  document.querySelectorAll('[data-add-custom-field]').forEach(button => button.addEventListener('click', () => addCustomFieldRow(button.dataset.addCustomField)));
  function populateCustomFields(kind, values = {}) {
    const list = document.querySelector(`[data-custom-fields="${kind}"]`);
    list.replaceChildren();
    Object.entries(values && typeof values === 'object' ? values : {}).forEach(([name, value]) => addCustomFieldRow(kind, name, value));
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
  function populateOrganizationRegionOptions(selectedRegion = '') {
    const select = byId('organization-region');
    const regions = new Set([
      'Central Asia', 'East Asia', 'East Nairobi', 'Eastern Europe',
      'Middle East', 'North America', 'Sub-Saharan Africa'
    ]);
    const directory = window.crmDirectory ?? {};
    [...(directory.organizations ?? []), ...(directory.contractors ?? [])].forEach(record => {
      const region = String(record.region ?? '').trim();
      if (region) regions.add(region);
    });
    const selected = String(selectedRegion ?? '').trim();
    if (selected) regions.add(selected);
    select.replaceChildren(new Option('Select a region', ''));
    [...regions].sort((a, b) => a.localeCompare(b)).forEach(region => select.add(new Option(region, region)));
    select.value = selected;
  }
  function prepareContractor(record = null) {
    if (!window.crmSession?.authenticated) return;
    ++epoch;
    byId('add-contractor-form').reset();
    bootstrap.Tab.getOrCreateInstance(byId('contractor-basic-tab')).show();
    byId('contractor-region-editor').hidden = true;
    byId('contractor-region-value').disabled = true;
    byId('contractor-region-message').textContent = '';
    editingId = record?.id ?? null;
    byId('add-contractor-title').textContent = record ? 'Edit contractor' : 'Add contractor';
    const name = splitName(record);
    setSavedSelection('contractor-prefix', name.prefix);
    byId('contractor-first-name').value = name.first;
    byId('contractor-middle-name').value = name.middle;
    byId('contractor-last-name').value = name.last;
    setSavedSelection('contractor-suffix', name.suffix);
    byId('contractor-legacy-name').value = record?.full_name ?? '';
    setNameMode(Boolean(record && !record.first_name && !record.last_name));
    clearContactValidity('contractor');
    setSavedSelection('contractor-role', record?.role ?? '');
    byId('contractor-email').value = record?.email ?? '';
    setPhone('contractor-phone', record?.phone ?? '');
    ['street_address_1', 'street_address_2', 'city', 'state_province', 'country'].forEach(field => { byId(`contractor-${({street_address_1:'street1',street_address_2:'street2',state_province:'state'})[field] ?? field}`).value = record?.[field] ?? ''; });
    populateCustomFields('contractor', record?.extra_information);
    organizationOptions(record);
    byId('contractor-organization-help').textContent = record ? 'Organization transfers are a separate workflow; this editor preserves the current organization.' : 'Region comes from the selected organization.';
    byId('contractor-form-message').textContent = !record && window.crmDirectory.organizations.length === 0
      ? 'Create an organization from Organizations before adding a contractor.' : '';
    setBusy(false);
  }
  function closeRegionEditor() {
    byId('contractor-region-editor').hidden = true;
    byId('contractor-region-value').disabled = true;
    byId('contractor-region-message').textContent = '';
  }
  byId('cancel-contractor-region').addEventListener('click', closeRegionEditor);
  byId('contractor-organization').addEventListener('change', closeRegionEditor);
  byId('add-contractor-region').addEventListener('click', () => {
    if (busy || !window.crmSession?.authenticated) return;
    const organization = window.crmDirectory.organizations.find(org => String(org.id) === byId('contractor-organization').value);
    if (!organization) { byId('contractor-form-message').textContent = 'Select an active organization before adding a region.'; return; }
    byId('contractor-region-editor').hidden = false;
    byId('contractor-region-value').disabled = false;
    byId('contractor-region-value').value = organization.region ?? '';
    byId('contractor-region-value').focus();
  });
  byId('save-contractor-region').addEventListener('click', async () => {
    if (busy || !window.crmSession?.authenticated) return;
    const id = Number(byId('contractor-organization').value);
    const region = byId('contractor-region-value').value.trim() || null;
    const token = epoch;
    setBusy(true);
    try {
      const saved = await window.crmApi.setOrganizationRegion({ id, region });
      if (!validSession(token)) return;
      const refreshed = await window.crmDirectory.refresh();
      if (!validSession(token)) return;
      if (refreshed) organizationOptions({ organization_id: saved.id });
      closeRegionEditor();
      window.crmNotify(refreshed ? 'Organization region saved.' : 'Region saved, but the directory could not reload.', refreshed ? 'success' : 'error');
    } catch (error) {
      if (!validSession(token)) return;
      byId('contractor-region-message').textContent = error.message;
      if (error.message === 'Login required') await window.crmSession.lock();
    } finally { if (token === epoch) setBusy(false); }
  });
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
  window.addEventListener('crm:edit-organization', event => {
    if (!window.crmSession?.authenticated || busy) return;
    const organization = event.detail;
    editingOrganizationId = organization.id;
    ++epoch;
    byId('organization-form').reset();
    bootstrap.Tab.getOrCreateInstance(byId('organization-basic-tab')).show();
    byId('organization-title').textContent = 'Edit Organization';
    byId('save-organization').textContent = 'Save changes';
    byId('organization-name').value = organization.name ?? '';
    populateOrganizationRegionOptions(organization.region ?? '');
    byId('organization-email').value = organization.email ?? '';
    setPhone('organization-phone', organization.phone ?? '');
    setPhone('organization-secondary-phone', organization.secondary_phone ?? '');
    byId('organization-secondary-contact').value = organization.secondary_contact ?? '';
    byId('organization-secondary-email').value = organization.secondary_email ?? '';
    ['street_address_1', 'street_address_2', 'city', 'state_province', 'country'].forEach(field => { byId(`organization-${({street_address_1:'street1',street_address_2:'street2',state_province:'state'})[field] ?? field}`).value = organization[field] ?? ''; });
    populateCustomFields('organization', organization.extra_information);
    byId('organization-notes').value = organization.notes ?? '';
    byId('organization-help').textContent = '';
    byId('inline-contractor-section').hidden = true;
    byId('inline-contractor-fields').hidden = true;
    byId('inline-contractor-fields').disabled = true;
    byId('organization-form-message').textContent = '';
    setBusy(false);
    bootstrap.Modal.getOrCreateInstance(byId('organization-modal')).show();
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
    if (event.relatedTarget) {
      editingOrganizationId = null;
      byId('organization-form').reset();
      bootstrap.Tab.getOrCreateInstance(byId('organization-basic-tab')).show();
      populateOrganizationRegionOptions();
      populateCustomFields('organization', {});
      byId('organization-title').textContent = 'Add organization';
      byId('save-organization').textContent = 'Save organization';
      byId('inline-contractor-section').hidden = false;
      byId('inline-contractor-fields').hidden = true;
      byId('inline-contractor-fields').disabled = true;
      byId('toggle-inline-contractor').setAttribute('aria-expanded', 'false');
      ['organization-phone', 'organization-secondary-phone', 'inline-contractor-phone'].forEach(id => setPhone(id));
      byId('inline-contractor-fields').querySelectorAll('input, select').forEach(input => { input.required = false; });
      clearContactValidity('inline-contractor');
      byId('organization-form-message').textContent = '';
    }
    setBusy(false);
  });
  byId('toggle-inline-contractor').addEventListener('click', event => {
    const expanded = byId('toggle-inline-contractor').getAttribute('aria-expanded') !== 'true';
    byId('toggle-inline-contractor').setAttribute('aria-expanded', String(expanded));
    byId('inline-contractor-fields').hidden = !expanded;
    byId('inline-contractor-fields').disabled = !expanded;
    byId('inline-contractor-fields').querySelectorAll('input, select').forEach(input => {
      input.required = expanded && ['inline-contractor-first-name', 'inline-contractor-last-name'].includes(input.id);
    });
    clearContactValidity('inline-contractor');
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
      byId(id).querySelectorAll('input').forEach(input => input.setCustomValidity(''));
      byId(id).querySelector('form').reset();
      byId(id).querySelectorAll('[role="status"]').forEach(element => { element.textContent = ''; });
      if (id === 'archive-modal') byId('archive-name').textContent = '';
      if (id === 'organization-modal') {
        editingOrganizationId = null;
        byId('organization-title').textContent = 'Add organization';
        byId('save-organization').textContent = 'Save organization';
        byId('organization-help').textContent = '';
      }
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
        window.crmNotify(successMessage);
      } else {
        window.crmNotify(`${successMessage} The list could not update automatically; reopen the workspace to reload.`, 'error');
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
    const contactValid = validateContact('contractor', 'contractor-form-message');
    if (!reportFormValidity(event.currentTarget) || !contactValid) return;
    const details = captureDetails('contractor', 'contractor-form-message');
    if (!details) return;
    if (!window.confirm('Confirm save this contractor?')) return;
    const createdAt = new Date().toISOString();
    const split = { prefix: byId('contractor-prefix').value, first: byId('contractor-first-name').value, middle: byId('contractor-middle-name').value, last: byId('contractor-last-name').value, suffix: byId('contractor-suffix').value };
    const sprint2Payload = {
      ...split, full_name: fullName(split), organization_id: Number(byId('contractor-organization').value),
      role: byId('contractor-role').value || null,
      email: byId('contractor-email').value.trim(),
      phone: byId('contractor-phone').value,
      address: { street_address_1: byId('contractor-street1').value.trim(), street_address_2: byId('contractor-street2').value.trim(), city: byId('contractor-city').value.trim(), state_province: byId('contractor-state').value.trim(), country: byId('contractor-country').value.trim() },
      extra_information: details.extra_information,
      headshot_filename: byId('contractor-headshot').files[0]?.name ?? null,
      created_at: createdAt,
    };
    const profile = {
      full_name: legacyNameMode ? byId('contractor-legacy-name').value : '',
      prefix: split.prefix || null,
      first_name: legacyNameMode ? null : split.first,
      middle_name: split.middle || null,
      last_name: legacyNameMode ? null : split.last,
      suffix: split.suffix || null,
      role: sprint2Payload.role, email: sprint2Payload.email || null, phone: sprint2Payload.phone.trim() || null,
      details,
    };
    const id = editingId;
    const request = id === null ? { organization_id: sprint2Payload.organization_id, profile } : { id, profile };
    const headshot = byId('contractor-headshot').files[0];
    mutate('add-contractor-modal', 'contractor-form-message',
      async () => {
        profile.details.image = await imagePayload(headshot);
        return id === null ? window.crmApi.createContractor(request) : window.crmApi.updateContractor(request);
      },
      saved => window.crmDirectory.showProfile(saved.id), 'Contractor saved.');
  });
  byId('organization-form').addEventListener('submit', event => {
    event.preventDefault();
    if (busy || !window.crmSession?.authenticated) return;
    const inlineOpen = editingOrganizationId === null && !byId('inline-contractor-fields').hidden;
    const contactValid = !inlineOpen || validateContact('inline-contractor', 'organization-form-message');
    const secondaryPhone = byId('organization-secondary-phone');
    secondaryPhone.setCustomValidity(secondaryPhone.value.trim() && !phoneIsValid(secondaryPhone.value.trim())
      ? 'Enter a secondary phone number with 7 to 15 digits and an optional leading country code' : '');
    if (!reportFormValidity(event.currentTarget) || !contactValid) return;
    const details = captureDetails('organization', 'organization-form-message');
    if (!details) return;
    if (!window.confirm('Confirm save this organization?')) return;
    const createdAt = new Date().toISOString();
    const extraContact = {
      prefix: '', first: byId('inline-contractor-first-name').value.trim(), middle: '',
      last: byId('inline-contractor-last-name').value.trim(), suffix: '',
    };
    const sprint2Payload = {
      name: byId('organization-name').value.trim(), region: byId('organization-region').value.trim() || null,
      phone: byId('organization-phone').value || null,
      email: byId('organization-email').value.trim() || null,
      address: { street_address_1: byId('organization-street1').value.trim(), street_address_2: byId('organization-street2').value.trim(), city: byId('organization-city').value.trim(), state_province: byId('organization-state').value.trim(), country: byId('organization-country').value.trim() },
      extra_information: details.extra_information,
      secondary_phone: byId('organization-secondary-phone').value || null,
      secondary_contact: byId('organization-secondary-contact').value.trim() || null,
      secondary_email: byId('organization-secondary-email').value.trim() || null,
      notes: byId('organization-notes').value.trim() || null,
      logo_filename: byId('organization-logo').files[0]?.name ?? null,
      created_at: createdAt,
      contractor: inlineOpen ? {
        full_name: fullName(extraContact), first_name: extraContact.first, last_name: extraContact.last,
        role: byId('inline-contractor-role').value,
        email: byId('inline-contractor-email').value.trim(), phone: byId('inline-contractor-phone').value,
      } : null,
    };
    // The current organization IPC request accepts only these fields.
    const request = { name: sprint2Payload.name, region: sprint2Payload.region, phone: sprint2Payload.phone, email: sprint2Payload.email, notes: sprint2Payload.notes,
      details: { ...details, secondary_phone: sprint2Payload.secondary_phone, secondary_contact: sprint2Payload.secondary_contact, secondary_email: sprint2Payload.secondary_email } };
    const organizationId = editingOrganizationId;
    const logo = byId('organization-logo').files[0];
    mutate('organization-modal', 'organization-form-message', async () => {
      request.details.image = await imagePayload(logo);
      const contact = sprint2Payload.contractor;
      const contractor = contact ? { full_name: '', prefix: null, first_name: contact.first_name, middle_name: null, last_name: contact.last_name, suffix: null, role: contact.role, email: contact.email || null, phone: contact.phone.trim() || null } : null;
      return organizationId === null
        ? window.crmApi.createOrganization({ ...request, contractor })
        : window.crmApi.updateOrganization({ id: organizationId, ...request });
    }, () => byId('nav-organizations').click(), organizationId === null ? 'Organization saved.' : 'Organization updated.');
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
    legacyNameMode = false;
    document.querySelectorAll('[data-existing-profile-choice]').forEach(option => option.remove());
    archiveId = null;
    setBusy(false);
    modalIds.forEach(id => {
      const modal = byId(id);
      modal.inert = true;
      modal.querySelector('form').reset();
      modal.querySelectorAll('input').forEach(input => input.setCustomValidity(''));
      if (id === 'add-contractor-modal') populateCustomFields('contractor', {});
      if (id === 'organization-modal') populateCustomFields('organization', {});
      modal.querySelectorAll('[role="status"]').forEach(element => { element.textContent = ''; });
      bootstrap.Modal.getInstance(modal)?.hide();
    });
    byId('archive-name').textContent = '';
    byId('contractor-organization').replaceChildren();
  });
})();
