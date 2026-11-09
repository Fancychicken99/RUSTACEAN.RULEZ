(() => {
  const appContent = document.getElementById('app-content');
  const contactsView = document.getElementById('view-contacts');
  const navDashboard = document.getElementById('nav-dashboard');
  const navContacts = document.getElementById('nav-contacts');
  const navOrganizations = document.getElementById('nav-organizations');
  if (!appContent || !contactsView || !navDashboard || !navContacts || !navOrganizations) return;
  let directoryQuery = '';


  let contractors = [];
  let organizations = [];
  let loaded = false;
  let loading = false;
  let loadError = null;
  let loadGeneration = 0;
  let filterGeneration = 0;
  let filterLoading = false;
  let filterError = null;
  let noteContractor = null;
  const pendingStatusIds = new Set();

  function updateDashboardMetricCounts() {
    const counts = {
      'Total Contractors': contractors.length,
      'Active Contractors': contractors.filter((contractor) => contractor.status === 'Active').length,
      'Inactive Contractors': contractors.filter((contractor) => contractor.status === 'Inactive').length,
      'Critical Alerts': contractors.filter(contractor => (contractor.days_since_last_contact == null || Number(contractor.days_since_last_contact) >= 30)).length,
    };

    document.querySelectorAll('.metric-card').forEach((card) => {
      const label = card.querySelector('.metric-label')?.textContent.trim();
      const value = card.querySelector('.metric-value');
      if (value && Object.hasOwn(counts, label)) value.textContent = loaded ? String(counts[label]) : '—';
      const foot = card.querySelector('.metric-foot');
      if (foot) foot.textContent = 'Saved records';
      if (label === 'Critical Alerts') {
        card.removeAttribute('aria-disabled');
        card.setAttribute('aria-label', `Show contractors overdue for contact: ${counts[label]}`);
      }
    });
  }

  function getAlertColor(days) {
    const age = Number(days);
    if (age >= 90) return 'danger';
    if (age >= 60) return 'orange';
    if (age >= 30) return 'warning';
    return 'success';
  }

  function matchesAlertLevel(days, alertLevel) {
    if (alertLevel === 'All') return true;
    if (days == null) return false;
    const age = Number(days);
    const threshold = Number(alertLevel);
    if (!Number.isFinite(age) || ![30, 60, 90].includes(threshold)) return false;
    const nextThreshold = threshold === 30 ? 60 : threshold === 60 ? 90 : Infinity;
    return age >= threshold && age < nextThreshold;
  }

  const contactListHtml = `
    <div class="page-heading d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div><p class="eyebrow mb-1">WORKSPACE</p><h1 class="h3 mb-1">Contact List</h1><p class="text-secondary mb-0">Browse and manage your contractor directory.</p></div>
      <button class="btn btn-primary d-flex align-items-center gap-2" type="button" data-bs-toggle="modal" data-bs-target="#add-contractor-modal"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add contractor</button>
    </div>
    <p id="directory-message" class="text-secondary" role="status" aria-live="polite"></p>
    <div class="d-flex justify-content-end align-items-center gap-2 mb-3"><label class="form-label mb-0" for="alert-level-filter">Alert Level</label><select id="alert-level-filter" class="form-select form-select-sm alert-level-select"><option value="All">All</option><option value="30">Yellow 30–59 days</option><option value="60">Orange 60–89 days</option><option value="90">Red 90+ days</option></select></div>
    <section class="card activity-card" aria-labelledby="contractor-list-title">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2"><div><h2 class="h5 mb-1" id="destination-title">Contractor Directory</h2><p class="text-secondary small mb-0">A directory of people in your workspace.</p></div><div class="d-flex align-items-center gap-3"><span class="text-secondary small" id="contractor-result-count"></span><button type="button" class="btn btn-sm btn-light d-none" id="btn-reset-destination">Clear View / View All</button></div></div>
      <div id="contact-active-filters" class="active-filter-pills px-3 pt-3" aria-live="polite"></div>
      <div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th scope="col">Name</th><th scope="col">Organization</th><th scope="col">Role</th><th scope="col">Region</th><th scope="col">Country</th><th scope="col">City</th><th scope="col">Status</th><th scope="col">Last Contact</th><th scope="col">Notes</th><th scope="col">Actions</th></tr></thead><tbody id="contractor-table-body"></tbody></table></div>
    </section>
    <footer class="page-footer">© 2026 Hippo Harbor CRM <span>·</span> Secure, on-device workspace</footer>
  `;

  function contractorName(contractor) {
    return contractor.full_name ?? '';
  }

  function openEditOrgModal(id) {
    if (!window.crmSession?.authenticated) return false;
    const organization = organizations.find(item => String(item.id) === String(id));
    if (!organization) return false;
    window.dispatchEvent(new CustomEvent('crm:edit-organization', { detail: organization }));
    return true;
  }

  async function archiveOrganization(id) {
    if (!window.crmSession?.authenticated) return false;
    const organization = organizations.find(item => String(item.id) === String(id));
    if (!organization || !window.confirm(`Are you sure you want to archive ${organization.name}?`)) return false;
    const message = document.getElementById('workspace-message');
    try {
      await window.crmApi.archiveOrganization({ id: organization.id });
      const refreshed = await refreshSavedData();
      window.crmNotify(refreshed
        ? `${organization.name} archived. The record is retained.`
        : `${organization.name} archived, but the list could not reload. Reopen the workspace to refresh.`, refreshed ? 'success' : 'error');
      return refreshed;
    } catch (error) {
      window.crmNotify(error.message, 'error');
      if (error.message === 'Login required') await window.crmSession.lock('Session expired. Log in again.');
      return false;
    }
  }

  function openEditContractorModal(id) {
    if (!window.crmSession?.authenticated) return false;
    const record = contractors.find(contractor => String(contractor.id) === String(id));
    if (!record) return false;
    window.dispatchEvent(new CustomEvent('crm:edit-contractor', { detail: record }));
    return true;
  }

  function lastContactDate(contractor) {
    const explicitDate = contractor.last_contact_at ?? contractor.last_contact_date ?? contractor.last_contacted_at ?? contractor.lastContactDate;
    if (explicitDate) {
      const normalized = /[zZ]|[+-]\d\d:\d\d$/.test(explicitDate) ? explicitDate : explicitDate.replace(' ', 'T') + 'Z';
      const parsedDate = new Date(normalized);
      if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
    }

    const elapsedDays = contractor.days_since_last_contact ?? contractor.daysSinceLastContact;
    if (elapsedDays == null) return null;
    const daysSinceContact = Number(elapsedDays);
    if (!Number.isFinite(daysSinceContact)) return null;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - daysSinceContact);
    return date;
  }

  function renderTable(data, tableBodyId = 'contractor-table-body', resultCountId = 'contractor-result-count') {
    const tableBody = document.getElementById(tableBodyId);
    const resultCount = document.getElementById(resultCountId);
    if (!tableBody) return;
    const table = tableBody.closest('table');
    window.crmDestroyTable?.(table);
    tableBody.replaceChildren();
    tableBody.dataset.loading = String(loading || filterLoading);
    if (data.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 10;
      cell.className = 'text-secondary p-4';
      const emptyIcon = document.createElement('i');
      emptyIcon.className = 'bi bi-person-lines-fill text-primary me-2';
      emptyIcon.setAttribute('aria-hidden', 'true');
      const emptyMessage = filterLoading ? 'Filtering saved contractors…' : filterError
        ? 'Could not filter records. Adjust filters and try again.'
        : loading ? 'Loading saved contractors…' : loadError
        ? 'Could not load records. Reopen the workspace to try again.'
        : !loaded ? 'Log in to load saved contractors.'
        : contractors.length === 0 ? 'No contractors have been saved yet.' : 'No contractors match these filters.';
      cell.append(emptyIcon, document.createTextNode(emptyMessage));
      row.appendChild(cell);
      tableBody.appendChild(row);
    }

    const orderedData = [...data].sort((a, b) => {
      const dateA = lastContactDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
      const dateB = lastContactDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
      return dateA - dateB;
    });
    orderedData.forEach((contractor) => {
      const row = document.createElement('tr');
      const cells = [
        contractorName(contractor),
        contractor.organization_name,
        contractor.role,
        contractor.region,
        contractor.country,
        contractor.city,
      ];
      cells.forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value ?? 'Not provided';
        if (index === 0) cell.classList.add('fw-semibold');
        row.appendChild(cell);
      });
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      const active = String(contractor.status ?? '').toLowerCase() === 'active';
      badge.className = `badge ${active ? 'bg-success' : 'bg-secondary'}`;
      badge.textContent = contractor.status ?? '';
      statusCell.appendChild(badge);
      const canToggle = ['Active', 'Inactive'].includes(contractor.status);
      const switchWrap = document.createElement('div');
      switchWrap.className = 'form-check form-switch d-inline-flex align-items-center ms-2 mb-0';
      const statusToggle = document.createElement('input');
      statusToggle.className = 'form-check-input contractor-status-toggle';
      statusToggle.type = 'checkbox';
      statusToggle.role = 'switch';
      statusToggle.checked = active;
      statusToggle.disabled = !canToggle || pendingStatusIds.has(contractor.id);
      statusToggle.setAttribute('aria-label', `Mark ${contractorName(contractor)} ${active ? 'inactive' : 'active'}`);
      statusToggle.title = canToggle ? 'Toggle Active/Inactive' : 'Only Active and Inactive records can be toggled';
      statusToggle.addEventListener('click', event => event.stopPropagation());
      statusToggle.addEventListener('change', () => changeContractorStatus(contractor, statusToggle));
      switchWrap.appendChild(statusToggle);
      statusCell.appendChild(switchWrap);

      const daysSinceContact = Number(contractor.days_since_last_contact);
      if (Number.isFinite(daysSinceContact) && daysSinceContact >= 30) {
        const alertBadge = document.createElement('span');
        const color = getAlertColor(daysSinceContact);
        alertBadge.className = `badge ms-1 ${color === 'orange' ? 'text-white' : color === 'warning' ? 'bg-warning text-dark' : `bg-${color}`}`;
        if (color === 'orange') alertBadge.style.backgroundColor = '#fd7e14';
        alertBadge.textContent = `${daysSinceContact} days`;
        alertBadge.setAttribute('aria-label', `${daysSinceContact} days since last contact; ${color} alert`);
        statusCell.appendChild(alertBadge);
      }
      row.appendChild(statusCell);
      const contactDate = lastContactDate(contractor);
      const dateCell = document.createElement('td');
      dateCell.textContent = contactDate
        ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(contactDate)
        : 'Date unavailable';
      dateCell.classList.add('text-secondary');
      if (Number.isFinite(daysSinceContact)) {
        const age = document.createElement('span'); age.className = 'visually-hidden';
        age.textContent = ` (${daysSinceContact} days; ${getAlertColor(daysSinceContact)} alert level)`;
        dateCell.appendChild(age);
      }
      row.appendChild(dateCell);
      const alertColor = Number.isFinite(daysSinceContact) ? getAlertColor(daysSinceContact) : 'success';
      row.style.borderLeft = `4px solid ${alertColor === 'orange' ? '#fd7e14' : alertColor === 'danger' ? 'var(--bs-danger)' : alertColor === 'warning' ? 'var(--bs-warning)' : 'var(--bs-success)'}`;
      const noteCell = document.createElement('td');
      const noteButton = document.createElement('button');
      noteButton.type = 'button';
      noteButton.className = 'btn btn-sm btn-outline-primary';
      noteButton.innerHTML = '<i class="bi bi-journal-text" aria-hidden="true"></i><span class="visually-hidden">Log contact note</span>';
      noteButton.title = 'Log contact note';
      noteButton.addEventListener('click', event => {
        event.stopPropagation();
        openContactNote(contractor);
      });
      noteCell.appendChild(noteButton);
      row.appendChild(noteCell);
      const actionCell = document.createElement('td');
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn btn-sm btn-outline-primary';
      editButton.innerHTML = '<i class="bi bi-pencil-square me-1" aria-hidden="true"></i>Edit';
      editButton.setAttribute('aria-label', `Edit ${contractorName(contractor)}`);
      editButton.addEventListener('click', event => {
        event.stopPropagation();
        openEditContractorModal(contractor.id);
      });
      actionCell.appendChild(editButton);
      row.appendChild(actionCell);
      row.classList.add('contractor-row');
      row.dataset.contractorId = String(contractor.id);
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `Open profile for ${cells[0]}`);
      row.addEventListener('click', () => {
        renderContractorProfile(contractor);
        switchView('view-contractor-profile', { contractorId: contractor.id });
      });
      row.addEventListener('keydown', (event) => {
        if (event.target !== row) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          renderContractorProfile(contractor);
          switchView('view-contractor-profile', { contractorId: contractor.id });
        }
      });
      tableBody.appendChild(row);
    });
    if (resultCount) resultCount.textContent = `${data.length} contractor${data.length === 1 ? '' : 's'}`;
    renderActiveFilterPills('contact-active-filters', readContactFilters(), removeContactFilter);
    window.crmDataTable?.(table);
  }

  function renderContractorProfile(contractor) {
    const profile = document.getElementById('contractor-profile-content');
    profile.replaceChildren();
    const body = document.createElement('div');
    body.className = 'card-body p-4';
    const profileStatus = String(contractor.status ?? '').toLowerCase();
    if (profileStatus === 'deceased' || profileStatus === 'archived' || contractor.archived_at) {
      const banner = document.createElement('div');
      const isDeceased = profileStatus === 'deceased';
      banner.className = `profile-status-banner profile-status-${isDeceased ? 'deceased' : 'archived'}`;
      banner.textContent = isDeceased ? 'Deceased' : 'Archived';
      body.appendChild(banner);
    }
    const header = document.createElement('div');
    header.className = 'contractor-profile-hero d-flex align-items-center gap-4 mb-4';
    const imageWrap = document.createElement('div');
    imageWrap.className = 'contractor-profile-image';
    const image = document.createElement('img');
    image.alt = `Profile picture of ${contractorName(contractor)}`;
    image.hidden = true;
    const placeholder = document.createElement('span');
    placeholder.className = 'contractor-profile-placeholder';
    placeholder.innerHTML = '<i class="bi bi-person-square" aria-hidden="true"></i><span>Profile picture unavailable</span>';
    imageWrap.append(image, placeholder);
    const nameBlock = document.createElement('div');
    const name = document.createElement('h2');
    name.className = 'h4 mb-1';
    name.textContent = contractorName(contractor);
    const role = document.createElement('p');
    role.className = 'text-secondary mb-0';
    role.textContent = contractor.role ?? '';
    nameBlock.append(name, role);
    header.append(imageWrap, nameBlock);
    body.appendChild(header);

    const details = document.createElement('div');
    details.className = 'row g-3';
    const fields = [
      ['Organization', contractor.organization_name], ['Region', contractor.region],
      ['Street Address 1', contractor.street_address_1], ['Street Address 2', contractor.street_address_2],
      ['City', contractor.city], ['State/Province', contractor.state_province], ['Country', contractor.country],
      ['Status', contractor.status], ['Internal ID', contractor.id], ['Phone', contractor.phone],
    ];
    fields.forEach(([label, value]) => {
      const column = document.createElement('div');
      column.className = 'col-12 col-sm-6';
      const caption = document.createElement('div');
      caption.className = 'small text-secondary mb-1';
      caption.textContent = label;
      const content = document.createElement('div');
      content.className = 'fw-semibold';
      content.textContent = value ?? '—';
      column.append(caption, content);
      details.appendChild(column);
    });
    const emailColumn = document.createElement('div');
    emailColumn.className = 'col-12 col-sm-6';
    const emailLabel = document.createElement('div');
    emailLabel.className = 'small text-secondary mb-1';
    emailLabel.textContent = 'Email';
    const email = document.createElement('span');
    email.textContent = contractor.email ?? '';
    emailColumn.append(emailLabel, email);
    details.appendChild(emailColumn);
    if (contractor.extra_information && typeof contractor.extra_information === 'object') {
      Object.entries(contractor.extra_information).forEach(([label, value]) => {
        const column = document.createElement('div'); column.className = 'col-12 col-sm-6';
        const caption = document.createElement('div'); caption.className = 'small text-secondary mb-1'; caption.textContent = label;
        const content = document.createElement('div'); content.className = 'fw-semibold';
        if (value && typeof value === 'object' && value.type === 'relation') {
          const source = value.entity_type === 'organization' ? organizations : contractors;
          const related = source.find(record => String(record.id) === String(value.entity_id));
          content.textContent = related?.full_name || related?.name || `Related ${value.entity_type} #${value.entity_id}`;
        } else content.textContent = value && typeof value === 'object' ? (value.value ?? '—') : (value ?? '—');
        column.append(caption, content); details.appendChild(column);
      });
    }
    body.appendChild(details);
    const actions = document.createElement('div');
    actions.className = 'd-flex gap-2 mt-4';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.id = 'edit-contractor'; edit.className = 'btn btn-primary';
    edit.textContent = 'Edit contractor';
    edit.addEventListener('click', () => window.dispatchEvent(new CustomEvent('crm:edit-contractor', { detail: contractor })));
    const archive = document.createElement('button');
    archive.type = 'button'; archive.id = 'archive-contractor'; archive.className = 'btn btn-warning';
    archive.innerHTML = '<i class="bi bi-file-earmark-zip me-1" aria-hidden="true"></i>Archive contractor';
    archive.addEventListener('click', () => window.dispatchEvent(new CustomEvent('crm:archive-contractor', { detail: contractor })));
    const tools = document.createElement('button'); tools.type = 'button'; tools.className = 'btn btn-outline-primary'; tools.textContent = 'Tags, skills & history';
    tools.addEventListener('click', () => window.dispatchEvent(new CustomEvent('crm:open-record-tools', {detail:{kind:'contractor',id:contractor.id}})));
    actions.append(edit, tools, archive);
    for (const [method,label,available] of [['tel','Call',contractor.phone],['sms','SMS',contractor.phone],['teams','Teams chat',contractor.email]]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-outline-primary'; button.textContent = label; button.disabled = !available;
      button.addEventListener('click', async () => { try { await window.crmApi.openContactAction({id:contractor.id,method}); } catch(error) { window.crmNotify(error.message,'error'); } }); actions.appendChild(button);
    }
    body.appendChild(actions);
    profile.appendChild(body);
    window.crmMedia?.loadInto(image, 'contractor', contractor.id, placeholder);
  }

  function renderContactList() {
    contactsView.innerHTML = contactListHtml;
    if (contactsView.classList.contains('d-none')) switchView('view-contacts');
    document.getElementById('alert-level-filter').addEventListener('change', loadFilteredDirectory);
    document.getElementById('btn-reset-destination').addEventListener('click', () => {
      document.getElementById('destination-title').innerText = 'Contractor Directory';
      document.getElementById('btn-reset-destination').classList.add('d-none');
      clearContactFilters();
      loadFilteredDirectory();
    });
    return loadFilteredDirectory();
  }

  function readContactFilters() {
    return {
      region: document.getElementById('contractor-region-filter')?.value.trim() ?? '',
      country: document.getElementById('contractor-country-filter')?.value.trim() ?? '',
      citySector: document.getElementById('contractor-city-sector-filter')?.value.trim() ?? '',
      status: document.getElementById('filter-status')?.value ?? 'All',
      organization: document.getElementById('filter-organization')?.value ?? 'All',
      query: directoryQuery,
      tag: document.getElementById('filter-tag')?.value.trim() || '',
      skill: document.getElementById('filter-skill')?.value.trim() || '',
      alertLevel: document.getElementById('alert-level-filter')?.value ?? 'All',
    };
  }

  function renderActiveFilterPills(containerId, filters, onRemove) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();
    const labels = { region: 'Region', country: 'Country', citySector: 'City', status: 'Status', organization: 'Organization', query: 'Search', tag: 'Tag', skill: 'Skill', alertLevel: 'Alert Level' };
    const active = Object.entries(filters).filter(([key, value]) => value && value !== 'All');
    active.forEach(([key, value]) => {
      const pill = document.createElement('span');
      pill.className = 'badge rounded-pill text-bg-primary active-filter-pill';
      const text = document.createElement('span');
      const organization = key === 'organization' ? organizations.find(item => String(item.id) === String(value))?.name : null;
      text.textContent = `${labels[key] ?? key}: ${organization ?? value}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'active-filter-remove';
      remove.setAttribute('aria-label', `Remove ${labels[key] ?? key} filter`);
      remove.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
      remove.addEventListener('click', () => onRemove(key));
      pill.append(text, remove);
      container.appendChild(pill);
    });
    container.hidden = active.length === 0;
  }

  function removeContactFilter(key) {
    const controls = { region: 'contractor-region-filter', country: 'contractor-country-filter', citySector: 'contractor-city-sector-filter', status: 'filter-status', organization: 'filter-organization', alertLevel: 'alert-level-filter', tag: 'filter-tag', skill: 'filter-skill' };
    if (key === 'query') {
      directoryQuery = '';
      const search = document.getElementById('global-search');
      if (search) search.value = '';
      syncSearchChrome();
    } else if (controls[key]) {
      const control = document.getElementById(controls[key]);
      if (control) control.value = key === 'status' || key === 'organization' || key === 'alertLevel' ? 'All' : '';
    }
    showFilteredDirectory();
  }

  async function changeContractorStatus(contractor, input) {
    const previousStatus = contractor.status;
    const nextStatus = input.checked ? 'Active' : 'Inactive';
    pendingStatusIds.add(contractor.id);
    contractor.status = nextStatus;
    const index = contractors.findIndex(record => record.id === contractor.id);
    if (index >= 0) contractors[index].status = nextStatus;
    updateDashboardMetricCounts();
    renderOrganizations();
    renderTable(filterContractors(readContactFilters(), contractors));
    try {
      const updated = await window.crmApi.setContractorStatus({ id: contractor.id, status: nextStatus });
      Object.assign(contractor, updated);
      if (index >= 0) Object.assign(contractors[index], updated);
      updateDashboardMetricCounts();
      renderRegions();
      renderOrganizations();
      renderTable(filterContractors(readContactFilters(), contractors));
      const message = document.getElementById('directory-message');
      if (message) message.textContent = `${contractorName(contractor)} marked ${nextStatus.toLowerCase()}.`;
    } catch (error) {
      contractor.status = previousStatus;
      if (index >= 0) contractors[index].status = previousStatus;
      updateDashboardMetricCounts();
      renderOrganizations();
      renderTable(filterContractors(readContactFilters(), contractors));
      const message = document.getElementById('directory-message');
      if (message) message.textContent = error.message;
      if (error.message === 'Login required') await window.crmSession.lock('Session expired. Log in again.');
    } finally {
      pendingStatusIds.delete(contractor.id);
      if (window.crmSession?.authenticated) renderTable(filterContractors(readContactFilters(), contractors));
    }
  }

  function openContactNote(contractor) {
    noteContractor = contractor;
    document.getElementById('contact-note-title').textContent = `Log contact note · ${contractorName(contractor)}`;
    document.getElementById('contact-note-timestamp').textContent = `Timestamp: ${new Date().toISOString()}`;
    document.getElementById('contact-note-editor').textContent = '';
    document.getElementById('contact-note-message').textContent = '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('contact-note-modal')).show();
  }

  function clearContactFilters() {
    const table = document.getElementById('contractor-table-body')?.closest('table'); if (table) { table.dataset.resetOrder = 'true'; delete table.dataset.manualOrder; }
    document.getElementById('contractor-region-filter').value = '';
    document.getElementById('filter-tag').value = ''; document.getElementById('filter-skill').value = '';
    document.getElementById('contractor-country-filter').value = '';
    document.getElementById('contractor-city-sector-filter').value = '';
    document.getElementById('filter-status').value = 'All';
    document.getElementById('filter-organization').value = 'All';
    const alertLevel = document.getElementById('alert-level-filter');
    if (alertLevel) alertLevel.value = 'All';
    directoryQuery = '';
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) globalSearch.value = '';
    syncSearchChrome();
  }

  function syncSearchChrome() {
    const globalSearch = document.getElementById('global-search');
    const clearButton = document.getElementById('clear-global-search');
    const shortcut = document.querySelector('.search-shortcut');
    if (clearButton) clearButton.hidden = !globalSearch?.value;
    if (shortcut) shortcut.hidden = Boolean(globalSearch?.value);
  }

  function editDistanceAtMost(left, right, limit) {
    if (Math.abs(left.length - right.length) > limit) return limit + 1;
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      const current = [i];
      let rowMinimum = i;
      for (let j = 1; j <= right.length; j += 1) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
        );
        rowMinimum = Math.min(rowMinimum, current[j]);
      }
      if (rowMinimum > limit) return limit + 1;
      previous = current;
    }
    return previous[right.length];
  }

  function hasSingleAdjacentTransposition(left, right) {
    if (left.length !== right.length) return false;
    const differences = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) differences.push(index);
    }
    return differences.length === 2 && differences[1] === differences[0] + 1 &&
      left[differences[0]] === right[differences[1]] && left[differences[1]] === right[differences[0]];
  }

  function matchesSearchWithTypos(contractor, query) {
    if (!query) return true;
    const searchableText = [contractorName(contractor), contractor.organization_name, contractor.role,
      contractor.region, contractor.country, contractor.city, contractor.email]
      .filter(Boolean).join(' ').toLowerCase();
    if (searchableText.includes(query)) return true;

    const words = searchableText.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const queryWords = query.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return queryWords.every((queryWord) => {
      if (queryWord.length < 3) return words.some((word) => word.includes(queryWord));
      const maxDistance = queryWord.length < 5 ? 1 : 2;
      return words.some((word) => word.includes(queryWord) ||
        hasSingleAdjacentTransposition(queryWord, word) ||
        (Math.abs(word.length - queryWord.length) <= maxDistance && editDistanceAtMost(queryWord, word, maxDistance) <= maxDistance));
    });
  }

  function renderMetricDestination(viewId, title, description, contractors) {
    const destination = document.getElementById(viewId);
    destination.innerHTML = `
      <div class="page-heading d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <p class="eyebrow mb-1">DASHBOARD / DESTINATION</p>
          <h1 class="h3 mb-1">${title}</h1>
          <p class="text-secondary mb-0">${description}</p>
        </div>
        <button class="btn btn-light" type="button" data-return-dashboard><i class="bi bi-arrow-left me-1" aria-hidden="true"></i> Dashboard</button>
      </div>
      <section class="card activity-card" aria-label="${title} results">
        <div class="card-header d-flex align-items-center justify-content-between gap-2">
          <h2 class="h5 mb-0">${title}</h2>
          <span class="text-secondary small" id="metric-result-count"></span>
        </div>
        <div class="card-body" id="metric-date-groups"></div>
      </section>
    `;
    destination.querySelector('[data-return-dashboard]').addEventListener('click', () => switchView('view-dashboard'));
    const groups = new Map();
    contractors.forEach((contractor) => {
      const date = lastContactDate(contractor);
      const key = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : 'unknown';
      if (!groups.has(key)) groups.set(key, { date, contractors: [] });
      groups.get(key).contractors.push(contractor);
    });

    const groupContainer = destination.querySelector('#metric-date-groups');
    [...groups.entries()]
      .sort(([keyA, groupA], [keyB, groupB]) => {
        if (!groupA.date) return 1;
        if (!groupB.date) return -1;
        return keyA.localeCompare(keyB);
      })
      .forEach(([, group]) => {
        const groupSection = document.createElement('section');
        groupSection.className = 'mb-4';
        const heading = document.createElement('h3');
        heading.className = 'h6 text-secondary mb-2';
        heading.textContent = group.date
          ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(group.date)
          : 'Date unavailable';
        const list = document.createElement('ul');
        list.className = 'list-group list-group-flush';

        group.contractors
          .sort((a, b) => contractorName(a).localeCompare(contractorName(b)))
          .forEach((contractor) => {
            const item = document.createElement('li');
            item.className = 'list-group-item px-0 d-flex flex-wrap align-items-center justify-content-between gap-2';
            const details = document.createElement('div');
            const name = document.createElement('strong');
            name.className = 'd-block';
            name.textContent = contractorName(contractor) || `Name unavailable (${contractor.id ?? 'unknown record'})`;
            const organization = document.createElement('span');
            organization.className = 'small text-secondary';
            organization.textContent = [contractor.organization_name, contractor.role].filter(Boolean).join(' · ');
            details.append(name, organization);

            const status = document.createElement('span');
            status.className = `badge ${contractor.status === 'Inactive' ? 'bg-secondary' : 'bg-danger'}`;
            status.textContent = contractor.status || title;
            item.append(details, status);
            list.appendChild(item);
          });

        groupSection.append(heading, list);
        groupContainer.appendChild(groupSection);
      });
    const resultCount = destination.querySelector('#metric-result-count');
    resultCount.textContent = `${contractors.length} contractor${contractors.length === 1 ? '' : 's'}`;
    switchView(viewId);
  }

  function filterContractors({ region = '', country = '', citySector = '', status = 'All', organization = 'All', query = '', alertLevel = 'All' }, records) {
    const normalizedRegion = region.toLowerCase();
    const normalizedCountry = country.toLowerCase();
    const normalizedCitySector = citySector.toLowerCase();
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((contractor) => {
      const matchesStatus = status === 'All' ||
        (status === 'Alert'
          ? Number(contractor.days_since_last_contact) >= 30
          : contractor.status === status);
      const days = Number(contractor.days_since_last_contact);
      const matchesAlert = matchesAlertLevel(days, alertLevel);

      return matchesStatus && matchesAlert &&
        (!normalizedRegion || String(contractor.region ?? '').toLowerCase().includes(normalizedRegion)) &&
        (organization === 'All' || String(contractor.organization_id) === organization) &&
        (!normalizedCountry || String(contractor.country ?? '').toLowerCase().includes(normalizedCountry)) &&
        (!normalizedCitySector || String(contractor.city ?? '').toLowerCase().includes(normalizedCitySector)) &&
        matchesSearchWithTypos(contractor, normalizedQuery);
    });
  }

  function renderOrganizations() {
    const tableBody = document.getElementById('organizations-table-body');
    const table = document.getElementById('organizations-table');
    if (!tableBody || !table) return;
    window.crmDestroyTable?.(table);
    tableBody.replaceChildren();
    if (organizations.length === 0) {
      const row = document.createElement('tr');
      const empty = document.createElement('td');
      empty.colSpan = 5;
      empty.className = 'text-secondary p-4';
      const icon = document.createElement('i');
      icon.className = 'bi bi-buildings text-primary me-2';
      icon.setAttribute('aria-hidden', 'true');
      empty.append(icon, document.createTextNode(loading ? 'Loading organizations…' : loadError
        ? 'Could not load records. Reopen the workspace to try again.'
        : loaded ? 'No organizations have been saved yet.' : 'Log in to load organizations.'));
      row.appendChild(empty);
      tableBody.appendChild(row);
    }

    const query = directoryQuery.trim().toLocaleLowerCase();
    const tag = document.getElementById('organization-tag-filter').value.trim();
    const skill = document.getElementById('organization-skill-filter').value.trim();
    const visibleOrganizations = organizations.filter(organization => {
      const meta = window.crmWorkspace?.snapshot?.meta.find(record => record.kind === 'organization' && record.id === organization.id);
      return (!query || (organization.name + ' ' + (organization.region || '')).toLocaleLowerCase().includes(query)) &&
        (!tag || meta?.tags.some(value => value.toLowerCase() === tag.toLowerCase())) &&
        (!skill || meta?.skills.some(value => value.toLowerCase() === skill.toLowerCase()));
    });
    renderActiveFilterPills('organization-active-filters', {query:directoryQuery,tag,skill}, key => {
      if (key === 'query') {directoryQuery='';document.getElementById('global-search').value='';syncSearchChrome();}
      else document.getElementById(key === 'tag' ? 'organization-tag-filter' : 'organization-skill-filter').value='';
      renderOrganizations();
    });
    if (organizations.length && visibleOrganizations.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'text-secondary p-4';
      cell.textContent = 'No organizations match this search.';
      row.appendChild(cell);
      tableBody.appendChild(row);
    }
    visibleOrganizations.forEach((organization) => {
      const activeContractors = contractors.filter((contractor) =>
        contractor.organization_id === organization.id && contractor.status === 'Active'
      ).length;

      const row = document.createElement('tr');
      const name = document.createElement('th');
      name.scope = 'row';
      const nameIcon = document.createElement('i');
      nameIcon.className = 'bi bi-building text-primary me-2';
      nameIcon.setAttribute('aria-hidden', 'true');
      name.append(nameIcon, document.createTextNode(organization.name));
      const region = document.createElement('td');
      region.textContent = organization.region ?? 'Not provided';
      const count = document.createElement('td');
      count.textContent = String(activeContractors);
      const status = document.createElement('td');
      const statusWrap = document.createElement('div');
      statusWrap.className = 'form-check form-switch mb-0';
      const statusToggle = document.createElement('input');
      statusToggle.className = 'form-check-input';
      statusToggle.type = 'checkbox';
      statusToggle.role = 'switch';
      statusToggle.checked = organization.status === 'Active';
      statusToggle.setAttribute('aria-label', 'Active status for ' + organization.name);
      statusToggle.addEventListener('change', async () => {
        statusToggle.disabled = true;
        try { await window.crmApi.workspaceAction({action:'organization_status',id:organization.id,status:statusToggle.checked?'Active':'Inactive'}); await refreshSavedData(); window.crmNotify('Organization status updated.'); }
        catch(error) {statusToggle.checked=organization.status==='Active';window.crmNotify(error.message,'error');}
        finally {statusToggle.disabled=false;}
      });
      statusWrap.appendChild(statusToggle);
      const statusLabel = document.createElement('span');
      statusLabel.className = 'small text-secondary';
      statusLabel.textContent = organization.status;
      statusWrap.appendChild(statusLabel);
      status.appendChild(statusWrap);
      const actions = document.createElement('td');
      const rosterButton = document.createElement('button');
      rosterButton.className = 'btn btn-outline-primary mt-auto';
      rosterButton.type = 'button';
      rosterButton.innerHTML = '<i class="bi bi-people me-1" aria-hidden="true"></i> View roster';
      rosterButton.addEventListener('click', () => {
        clearContactFilters();
        document.getElementById('filter-organization').value = String(organization.id);
        switchView('view-contacts');
        renderContactList();
        document.getElementById('destination-title').innerText = `Roster: ${organization.name}`;
        document.getElementById('btn-reset-destination').classList.remove('d-none');
      });

      const editButton = document.createElement('button');
      editButton.className = 'btn btn-outline-primary mt-auto';
      editButton.type = 'button';
      editButton.innerHTML = '<i class="bi bi-pencil-square me-1" aria-hidden="true"></i>Edit';
      editButton.addEventListener('click', () => openEditOrgModal(organization.id));
      const archiveButton = document.createElement('button');
      archiveButton.className = 'btn btn-warning mt-auto';
      archiveButton.type = 'button';
      archiveButton.innerHTML = '<i class="bi bi-file-earmark-zip me-1" aria-hidden="true"></i>Archive';
      archiveButton.addEventListener('click', () => archiveOrganization(organization.id));
      const actionGroup = document.createElement('div');
      actionGroup.className = 'd-flex flex-wrap gap-2';
      actionGroup.append(rosterButton, editButton, archiveButton);
      actions.appendChild(actionGroup);
      row.append(name, region, count, status, actions);
      row.dataset.organizationId = String(organization.id);
      tableBody.appendChild(row);
    });
    window.crmDataTable?.(table);
  }

  function switchView(viewId, { contractorId = '', skipHistory = false, replaceHistory = false } = {}) {
    const views = Array.from(appContent.children);
    const targetView = document.getElementById(viewId);
    if (!targetView || !views.includes(targetView)) return;

    if (!skipHistory) {
      const routeNames = {
        'view-dashboard': 'dashboard',
        'view-contacts': 'contacts',
        'view-organizations': 'organizations',
        'view-contractor-profile': contractorId ? `contractors/${encodeURIComponent(contractorId)}` : 'contractors',
      };
      let route = routeNames[viewId] ?? viewId.replace(/^view-/, '');
      if (viewId === 'view-contacts') {
        const filters = readContactFilters();
        const routeParams = new URLSearchParams();
        if (filters.status !== 'All') routeParams.set('status', filters.status);
        if (filters.query) routeParams.set('q', filters.query);
        if (filters.region) routeParams.set('region', filters.region);
        if (filters.country) routeParams.set('country', filters.country);
        if (filters.citySector) routeParams.set('citySector', filters.citySector);
        if (filters.organization !== 'All') routeParams.set('organization', filters.organization);
        if (routeParams.size) route += `?${routeParams.toString()}`;
      }
      const nextHash = `#/${route}`;
      if (window.location.hash !== nextHash) {
        if (replaceHistory) window.history.replaceState(null, '', nextHash);
        else window.history.pushState(null, '', nextHash);
      }
    }

    views.forEach((view) => view.classList.add('d-none'));
    const navForView = {
      'view-dashboard': navDashboard,
      'view-contacts': navContacts,
      'view-organizations': navOrganizations,
      'view-contractor-profile': navContacts,
      'view-deployments': navDashboard,
      'view-pending-archive': navDashboard,
      'view-critical-alerts': navDashboard,
    };
    [navDashboard, navContacts, navOrganizations].forEach((link) => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });

    targetView.classList.remove('d-none');
    const activeNav = navForView[viewId];
    if (activeNav) {
      activeNav.classList.add('active');
      activeNav.setAttribute('aria-current', 'page');
    }
  }

  function restoreRouteFromUrl() {
    const route = window.location.hash.replace(/^#\/?/, '');
    const [path, query = ''] = route.split('?');
    const params = new URLSearchParams(query);

    if (path.startsWith('contractors/')) {
      const contractorId = decodeURIComponent(path.slice('contractors/'.length));
      const contractor = contractors.find((item) => String(item.id) === contractorId);
      if (contractor) {
        renderContractorProfile(contractor);
        switchView('view-contractor-profile', { contractorId, skipHistory: true });
        return;
      }
    }

    if (path === 'contacts') {
      clearContactFilters();
      document.getElementById('filter-status').value = params.get('status') || 'All';
      const regionFilter = document.getElementById('contractor-region-filter');
      const requestedRegion = params.get('region') || '';
      // Preserve saved/stale region links as actual queries, not an All fallback.
      if (requestedRegion && ![...regionFilter.options].some(option => option.value === requestedRegion)) {
        regionFilter.add(new Option(requestedRegion, requestedRegion));
      }
      regionFilter.value = requestedRegion;
      document.getElementById('contractor-country-filter').value = params.get('country') || '';
      document.getElementById('contractor-city-sector-filter').value = params.get('citySector') || '';
      document.getElementById('filter-organization').value = params.get('organization') || 'All';
      directoryQuery = params.get('q') || '';
      document.getElementById('global-search').value = directoryQuery;
      syncSearchChrome();
      switchView('view-contacts', { skipHistory: true });
      return renderContactList();
    }

    if (path === 'organizations') {
      renderOrganizations();
      switchView('view-organizations', { skipHistory: true });
      return;
    }

    switchView('view-dashboard', { skipHistory: true });
  }

  window.addEventListener('popstate', restoreRouteFromUrl);

  navDashboard.addEventListener('click', () => switchView('view-dashboard'));
  navContacts.addEventListener('click', () => {
    switchView('view-contacts');
    renderContactList();
  });
  navOrganizations.addEventListener('click', () => {
    renderOrganizations();
    switchView('view-organizations');
  });
  document.querySelectorAll('.metric-card').forEach((card) => {
    const applyMetricFilter = (e) => {
      e.preventDefault();
      if (!loaded) return;
      const status = card.dataset.filterStatus;
      clearContactFilters();
      if (status !== 'Alert') document.getElementById('filter-status').value = status;
      renderContactList();
      if (status === 'Alert') {
        const alertFilter = document.getElementById('alert-level-filter');
        alertFilter.value = '30';
        alertFilter.dispatchEvent(new Event('change'));
      }
      const titles = { All: 'Contractor Directory', Active: 'Active Contractors', Inactive: 'Inactive Contractors', Alert: 'Critical Alerts' };
      document.getElementById('destination-title').textContent = titles[status] || 'Contractor Directory';
    };
    card.addEventListener('click', applyMetricFilter);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        applyMetricFilter(event);
      }
    });
  });

  const globalSearch = document.getElementById('global-search');
  const filterForm = document.getElementById('contractor-filter-form');
  const filterPanel = document.getElementById('contractor-filter-panel');
  const showFilteredDirectory = () => {
    if (contactsView.classList.contains('d-none')) return renderContactList();
    switchView('view-contacts', { replaceHistory: true });
    return loadFilteredDirectory();
  };

  globalSearch?.addEventListener('input', () => {
    directoryQuery = globalSearch.value;
    syncSearchChrome();
    if (!document.getElementById('view-organizations').classList.contains('d-none')) renderOrganizations();
    else if (directoryQuery.trim() || !contactsView.classList.contains('d-none')) showFilteredDirectory();
  });
  document.getElementById('clear-global-search')?.addEventListener('click', () => {
    if (!globalSearch) return;
    globalSearch.value = '';
    globalSearch.dispatchEvent(new Event('input', { bubbles: true }));
    globalSearch.focus();
  });
  filterForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    showFilteredDirectory();
    bootstrap.Offcanvas.getOrCreateInstance(filterPanel).hide();
  });
  filterForm?.querySelectorAll('select, input').forEach((control) => {
    control.addEventListener(control.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (!contactsView.classList.contains('d-none')) showFilteredDirectory();
    });
  });
  document.getElementById('clear-contractor-filters')?.addEventListener('click', () => {
    clearContactFilters();
    showFilteredDirectory();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      globalSearch?.focus();
    }
    if (event.key === 'Escape' && filterPanel?.classList.contains('show')) {
      bootstrap.Offcanvas.getOrCreateInstance(filterPanel).hide();
    }
  });
  syncSearchChrome();

  function updateFilterOptions() {
    const regionFilter = document.getElementById('contractor-region-filter');
    const organizationFilter = document.getElementById('filter-organization');
    const selectedRegion = regionFilter.value;
    const selectedOrganization = organizationFilter.value;
    regionFilter.replaceChildren(new Option('All regions', ''));
    organizationFilter.replaceChildren(new Option('All organizations', 'All'));
    const regions = [...new Set([...contractors, ...organizations].map(record => record.region).filter(Boolean))].sort();
    regions.forEach(region => regionFilter.add(new Option(region, region)));
    organizations.forEach(organization => organizationFilter.add(new Option(`${organization.name} · ${organization.region ?? 'No region'} (#${organization.id})`, String(organization.id))));
    if (regions.includes(selectedRegion)) regionFilter.value = selectedRegion;
    if (organizations.some(organization => String(organization.id) === selectedOrganization)) organizationFilter.value = selectedOrganization;
  }

  function renderRegions() {
    const container = document.getElementById('region-overview');
    container.replaceChildren();
    const counts = new Map();
    contractors.forEach(record => {
      const region = record.region ?? 'Not provided';
      counts.set(region, (counts.get(region) ?? 0) + 1);
    });
    if (!counts.size) container.textContent = loaded ? 'No saved contractor regions yet.' : 'No records loaded.';
    [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([region, count]) => {
      const item = document.createElement('div');
      item.className = 'mb-3';
      const label = document.createElement('p');
      label.className = 'd-flex justify-content-between mb-2';
      const name = document.createElement('strong');
      name.textContent = region;
      const total = document.createElement('span');
      total.textContent = `${count} contractor${count === 1 ? '' : 's'}`;
      label.append(name, total);
      const progress = document.createElement('div');
      progress.className = 'progress';
      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      bar.style.width = `${count / contractors.length * 100}%`;
      progress.appendChild(bar);
      item.append(label, progress);
      container.appendChild(item);
    });
  }

  function clearSavedData() {
    ++loadGeneration; // Ignore responses from requests started before locking.
    ++filterGeneration;
    filterLoading = false;
    filterError = null;
    contractors = [];
    organizations = [];
    loaded = false;
    loading = false;
    loadError = null;
    noteContractor = null;
    document.getElementById('contact-note-editor').replaceChildren();
    contactsView.replaceChildren();
    document.getElementById('organizations-table-body')?.replaceChildren();
    document.getElementById('contractor-profile-content').textContent = 'Select a contractor to view profile details.';
    ['view-deployments', 'view-pending-archive', 'view-critical-alerts'].forEach(id => document.getElementById(id).replaceChildren());
    clearContactFilters();
    updateFilterOptions();
    updateDashboardMetricCounts();
    renderRegions();
    window.crmNotify('');
    window.history.replaceState(null, '', '#/dashboard');
  }

  async function refreshSavedData() {
    if (!window.crmSession?.authenticated) return;
    const generation = ++loadGeneration;
    ++filterGeneration;
    filterLoading = false;
    filterError = null;
    loading = true;
    loaded = false;
    loadError = null;
    contractors = [];
    organizations = [];
    const status = document.getElementById('workspace-message');
    window.crmNotify('Loading saved records…', 'progress');
    updateDashboardMetricCounts();
    renderTable([]);
    renderOrganizations();
    document.getElementById('contractor-profile-content').textContent = 'Loading saved records…';
    try {
      const results = await Promise.all([window.crmApi.listContractors(), window.crmApi.listOrganizations()]);
      if (generation !== loadGeneration || !window.crmSession.authenticated) return;
      [contractors, organizations] = results;
      window.dispatchEvent(new Event('crm:records-loaded'));
      loaded = true;
      window.crmNotify('');
    } catch (error) {
      if (generation !== loadGeneration || !window.crmSession.authenticated) return;
      loadError = error.message;
      window.crmNotify(error.message, 'error');
      if (error.message === 'Login required') {
        await window.crmSession.lock('Session expired. Log in again.');
        return;
      }
    } finally {
      if (generation === loadGeneration) {
        loading = false;
      }
    }
    if (generation !== loadGeneration || !window.crmSession.authenticated) return;
    updateFilterOptions();
    updateDashboardMetricCounts();
    renderRegions();
    renderOrganizations();
    const directoryLoaded = await restoreRouteFromUrl();
    return generation === loadGeneration && loaded && directoryLoaded !== false;
  }

  async function loadFilteredDirectory() {
    if (!loaded || !window.crmSession?.authenticated) {
      renderTable([]);
      return false;
    }
    const generation = ++filterGeneration;
    const directoryGeneration = loadGeneration;
    const filters = readContactFilters();
    const region = filters.region || null;
    const current = () => generation === filterGeneration && directoryGeneration === loadGeneration && window.crmSession?.authenticated;
    filterLoading = true;
    filterError = null;
    renderTable([]);
    const count = document.getElementById('contractor-result-count');
    if (count) count.textContent = 'Filtering…';
    try {
      const records = await window.crmApi.searchRecords({ region, country: filters.country || null, city: filters.citySector || null,
        organization_id: filters.organization === 'All' ? null : Number(filters.organization), status: ['All', 'Alert'].includes(filters.status) ? null : filters.status,
        query: filters.query || null, tag: filters.tag || null, skill: filters.skill || null,
        due_days: filters.alertLevel !== 'All' ? Number(filters.alertLevel) : filters.status === 'Alert' ? 30 : null });
      if (!current()) return false;
      filterLoading = false;
      // The backend applies the lower alert threshold; keep each displayed alert in its color band.
      renderTable(records.filter(record => matchesAlertLevel(record.days_since_last_contact, filters.alertLevel)));
      return true;
    } catch (error) {
      if (!current()) return false;
      filterLoading = false;
      filterError = error.message;
      renderTable([]);
      const message = document.getElementById('directory-message');
      if (message) message.textContent = error.message;
      if (count) count.textContent = 'Unavailable';
      if (error.message === 'Login required') await window.crmSession.lock('Session expired. Log in again.');
      return false;
    }
  }

  document.getElementById('organization-tag-filter').addEventListener('input', renderOrganizations);
  document.getElementById('organization-skill-filter').addEventListener('input', renderOrganizations);
  window.addEventListener('crm:taxonomy-loaded', renderOrganizations);
  window.crmDirectory = Object.freeze({
    refresh: refreshSavedData,
    get loaded() { return loaded && !loading && !loadError; },
    get organizations() { return organizations.map(organization => ({ ...organization })); },
    get contractors() { return contractors.map(contractor => ({ ...contractor })); },
    showProfile(id) {
      const record = contractors.find(contractor => contractor.id === id);
      if (!record || !window.crmSession?.authenticated) return false;
      renderContractorProfile(record);
      switchView('view-contractor-profile', { contractorId: record.id });
      return true;
    },
    openEditContractorModal(id) {
      return openEditContractorModal(id);
    },
    openEditOrgModal(id) {
      return openEditOrgModal(id);
    },
    archiveOrganization(id) {
      return archiveOrganization(id);
    },
  });

  document.querySelectorAll('[data-note-command]').forEach(button => button.addEventListener('click', () => {
    document.getElementById('contact-note-editor').focus();
    document.execCommand(button.dataset.noteCommand, false);
  }));
  document.getElementById('contact-note-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!noteContractor || !window.crmSession?.authenticated) return;
    const editor = document.getElementById('contact-note-editor');
    const note = editor.innerText.trim();
    const message = document.getElementById('contact-note-message');
    const save = event.currentTarget.querySelector('[type="submit"]');
    if (!note) { message.textContent = 'Enter a note before saving.'; editor.focus(); return; }
    const timestamp = new Date().toISOString();
    save.disabled = true;
    message.textContent = 'Saving note…';
    try {
      await window.crmApi.recordContactNote({ id: noteContractor.id, method: document.getElementById('contact-note-method').value, note });
      noteContractor.last_contact_date = timestamp;
      noteContractor.days_since_last_contact = 0;
      const stored = contractors.find(record => record.id === noteContractor.id);
      if (stored) Object.assign(stored, { last_contact_date: timestamp, days_since_last_contact: 0 });
      renderTable(filterContractors(readContactFilters(), contractors));
      window.crmNotify('Contact note saved.');
      await refreshSavedData();
      bootstrap.Modal.getOrCreateInstance(document.getElementById('contact-note-modal')).hide();
    } catch (error) {
      message.textContent = error.message;
      if (error.message === 'Login required') await window.crmSession.lock('Session expired. Log in again.');
    } finally {
      save.disabled = false;
    }
  });
  document.getElementById('contact-note-modal').addEventListener('hidden.bs.modal', () => { noteContractor = null; });

  window.addEventListener('crm:unlocked', refreshSavedData);
  window.addEventListener('crm:locked', clearSavedData);
  updateFilterOptions();
  updateDashboardMetricCounts();
  renderRegions();
})();
