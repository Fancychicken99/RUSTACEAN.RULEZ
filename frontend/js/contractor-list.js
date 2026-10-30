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

  function updateDashboardMetricCounts() {
    const counts = {
      'Total Contractors': contractors.length,
      'Active Contractors': contractors.filter((contractor) => contractor.status === 'Active').length,
      'Inactive Contractors': contractors.filter((contractor) => contractor.status === 'Inactive').length,
      'Critical Alerts': '—',
    };

    document.querySelectorAll('.metric-card').forEach((card) => {
      const label = card.querySelector('.metric-label')?.textContent.trim();
      const value = card.querySelector('.metric-value');
      if (value && Object.hasOwn(counts, label)) value.textContent = loaded ? String(counts[label]) : '—';
      const foot = card.querySelector('.metric-foot');
      if (foot) foot.textContent = label === 'Critical Alerts' ? 'Contact history unavailable' : 'Saved records';
      if (label === 'Critical Alerts') card.setAttribute('aria-disabled', 'true');
    });
  }

  const contactListHtml = `
    <div class="page-heading d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div><p class="eyebrow mb-1">WORKSPACE</p><h1 class="h3 mb-1">Contact List</h1><p class="text-secondary mb-0">Browse and manage your contractor directory.</p></div>
      <button class="btn btn-primary d-flex align-items-center gap-2" type="button" data-bs-toggle="modal" disabled title="Unavailable in this build" data-bs-target="#add-contractor-modal"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add contractor</button>
    </div>
    <section class="card activity-card" aria-labelledby="contractor-list-title">
      <div class="card-header d-flex flex-wrap align-items-center justify-content-between gap-2"><div><h2 class="h5 mb-1" id="destination-title">Contractor Directory</h2><p class="text-secondary small mb-0">A directory of people in your workspace.</p></div><div class="d-flex align-items-center gap-3"><span class="text-secondary small" id="contractor-result-count"></span><button type="button" class="btn btn-sm btn-light d-none" id="btn-reset-destination">Clear View / View All</button></div></div>
      <div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th scope="col">Name</th><th scope="col">Organization</th><th scope="col">Role</th><th scope="col">Region</th><th scope="col">Country</th><th scope="col">City/Sector</th><th scope="col">Status</th><th scope="col">Last Contact</th></tr></thead><tbody id="contractor-table-body"></tbody></table></div>
    </section>
    <footer class="page-footer">© 2026 Northstar CRM <span>·</span> Secure, on-device workspace</footer>
  `;

  function contractorName(contractor) {
    return contractor.full_name ?? '';
  }

  function lastContactDate(contractor) {
    const explicitDate = contractor.last_contact_date ?? contractor.last_contacted_at ?? contractor.lastContactDate;
    if (explicitDate) {
      const parsedDate = new Date(explicitDate);
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
    tableBody.replaceChildren();
    if (data.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 8;
      cell.className = 'text-secondary p-4';
      cell.textContent = loading ? 'Loading saved contractors…' : loadError
        ? 'Could not load records. Use Refresh to try again.'
        : !loaded ? 'Log in to load saved contractors.'
        : contractors.length === 0 ? 'No contractors have been saved yet.' : 'No contractors match these filters.';
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
        contractor.city_sector,
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

      const daysSinceContact = Number(contractor.days_since_last_contact);
      if (daysSinceContact > 180) {
        const alertBadge = document.createElement('span');
        alertBadge.className = 'badge bg-danger ms-1';
        alertBadge.textContent = 'Critical';
        alertBadge.setAttribute('aria-label', `${daysSinceContact} days since last contact; critical attention required`);
        statusCell.appendChild(alertBadge);
      } else if (daysSinceContact > 90) {
        const alertBadge = document.createElement('span');
        alertBadge.className = 'badge bg-warning text-dark ms-1';
        alertBadge.textContent = 'Needs attention';
        alertBadge.setAttribute('aria-label', `${daysSinceContact} days since last contact; follow-up needed`);
        statusCell.appendChild(alertBadge);
      }
      row.appendChild(statusCell);
      const contactDate = lastContactDate(contractor);
      const dateCell = document.createElement('td');
      dateCell.textContent = contactDate
        ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(contactDate)
        : 'Date unavailable';
      dateCell.classList.add('text-secondary');
      row.appendChild(dateCell);
      row.classList.add('contractor-row');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `Open profile for ${cells[0]}`);
      row.addEventListener('click', () => {
        renderContractorProfile(contractor);
        switchView('view-contractor-profile', { contractorId: contractor.id });
      });
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          renderContractorProfile(contractor);
          switchView('view-contractor-profile', { contractorId: contractor.id });
        }
      });
      tableBody.appendChild(row);
    });
    if (resultCount) resultCount.textContent = `${data.length} contractor${data.length === 1 ? '' : 's'}`;
  }

  function renderContractorProfile(contractor) {
    const profile = document.getElementById('contractor-profile-content');
    profile.replaceChildren();
    const body = document.createElement('div');
    body.className = 'card-body p-4';
    const header = document.createElement('div');
    header.className = 'd-flex align-items-center gap-3 mb-4';
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = contractorName(contractor).slice(0, 2).toUpperCase();
    const nameBlock = document.createElement('div');
    const name = document.createElement('h2');
    name.className = 'h4 mb-1';
    name.textContent = contractorName(contractor);
    const role = document.createElement('p');
    role.className = 'text-secondary mb-0';
    role.textContent = contractor.role ?? '';
    nameBlock.append(name, role);
    header.append(avatar, nameBlock);
    body.appendChild(header);

    const details = document.createElement('div');
    details.className = 'row g-3';
    const fields = [
      ['Organization', contractor.organization_name], ['Region', contractor.region],
      ['Country', contractor.country], ['City/Sector', contractor.city_sector],
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
    body.appendChild(details);
    profile.appendChild(body);
  }

  function renderContactList() {
    contactsView.innerHTML = contactListHtml;
    if (contactsView.classList.contains('d-none')) switchView('view-contacts');
    renderTable(filterContractors(readContactFilters()));
    document.getElementById('btn-reset-destination').addEventListener('click', () => {
      document.getElementById('destination-title').innerText = 'Contractor Directory';
      document.getElementById('btn-reset-destination').classList.add('d-none');
      clearContactFilters();
      renderTable(filterContractors(readContactFilters()));
    });
  }

  function readContactFilters() {
    return {
      region: document.getElementById('contractor-region-filter')?.value.trim() ?? '',
      country: document.getElementById('contractor-country-filter')?.value.trim() ?? '',
      citySector: document.getElementById('contractor-city-sector-filter')?.value.trim() ?? '',
      status: document.getElementById('filter-status')?.value ?? 'All',
      organization: document.getElementById('filter-organization')?.value ?? 'All',
      query: directoryQuery,
    };
  }

  function clearContactFilters() {
    document.getElementById('contractor-region-filter').value = '';
    document.getElementById('contractor-country-filter').value = '';
    document.getElementById('contractor-city-sector-filter').value = '';
    document.getElementById('filter-status').value = 'All';
    document.getElementById('filter-organization').value = 'All';
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
      contractor.region, contractor.country, contractor.city_sector, contractor.email]
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

  function filterContractors({ region = '', country = '', citySector = '', status = 'All', organization = 'All', query = '' }) {
    const normalizedRegion = region.toLowerCase();
    const normalizedCountry = country.toLowerCase();
    const normalizedCitySector = citySector.toLowerCase();
    const normalizedQuery = query.trim().toLowerCase();

    return contractors.filter((contractor) => {
      const matchesStatus = status === 'All' ||
        (status === 'Alert'
          ? Number(contractor.days_since_last_contact) > 90
          : contractor.status === status);

      return matchesStatus &&
        (organization === 'All' || contractor.organization_name === organization) &&
        (!normalizedRegion || String(contractor.region ?? '').toLowerCase() === normalizedRegion) &&
        (!normalizedCountry || String(contractor.country ?? '').toLowerCase().includes(normalizedCountry)) &&
        (!normalizedCitySector || String(contractor.city_sector ?? '').toLowerCase().includes(normalizedCitySector)) &&
        matchesSearchWithTypos(contractor, normalizedQuery);
    });
  }

  function renderOrganizations() {
    const organizationsGrid = document.getElementById('organizations-grid');
    if (!organizationsGrid) return;
    organizationsGrid.replaceChildren();
    if (organizations.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-secondary';
      empty.textContent = loading ? 'Loading organizations…' : loadError
        ? 'Could not load records. Use Refresh to try again.'
        : loaded ? 'No organizations have been saved yet.' : 'Log in to load organizations.';
      organizationsGrid.appendChild(empty);
    }

    organizations.forEach((organization) => {
      // The current contractor response has the organization name, not its ID.
      const ambiguousName = organizations.filter(item => item.name === organization.name).length > 1;
      const activeContractors = contractors.filter((contractor) =>
        contractor.organization_name === organization.name && contractor.status === 'Active'
      ).length;

      const column = document.createElement('div');
      column.className = 'col';
      const card = document.createElement('article');
      card.className = 'card organization-card h-100';
      const cardBody = document.createElement('div');
      cardBody.className = 'card-body d-flex flex-column p-4';

      const logo = document.createElement('div');
      logo.className = 'org-logo-placeholder mb-3';
      // Initials are a placeholder until media storage/display is connected.
      logo.setAttribute('aria-label', `Organization initials for ${organization.name}`);
      const initials = document.createElement('span');
      initials.className = 'org-logo-initials';
      initials.textContent = organization.name.slice(0, 2).toUpperCase();
      const logoLabel = document.createElement('span');
      logoLabel.className = 'org-logo-label';
      logoLabel.textContent = 'No logo';
      logo.append(initials, logoLabel);

      const name = document.createElement('h2');
      name.className = 'h5 mb-3';
      name.textContent = organization.name;

      const contractorCount = document.createElement('p');
      contractorCount.className = 'mb-2';
      const countLabel = document.createElement('span');
      countLabel.className = 'text-secondary';
      countLabel.textContent = 'Active Contractors: ';
      const countValue = document.createElement('strong');
      countValue.textContent = ambiguousName ? 'Unavailable' : String(activeContractors);
      contractorCount.append(countLabel, countValue);

      const region = document.createElement('p');
      region.className = 'mb-4';
      const regionLabel = document.createElement('span');
      regionLabel.className = 'text-secondary d-block small mb-1';
      regionLabel.textContent = 'Primary Operating Region';
      const regionValue = document.createElement('strong');
      regionValue.textContent = organization.region ?? 'Not provided';
      region.append(regionLabel, regionValue);

      const rosterButton = document.createElement('button');
      rosterButton.className = 'btn btn-outline-primary mt-auto';
      rosterButton.type = 'button';
      rosterButton.textContent = 'View Roster';
      rosterButton.disabled = ambiguousName;
      if (ambiguousName) rosterButton.title = 'Roster unavailable for organizations with duplicate names.';
      rosterButton.addEventListener('click', () => {
        clearContactFilters();
        document.getElementById('filter-organization').value = organization.name;
        switchView('view-contacts');
        renderContactList();
        document.getElementById('destination-title').innerText = `Roster: ${organization.name}`;
        document.getElementById('btn-reset-destination').classList.remove('d-none');
      });

      cardBody.append(logo, name, contractorCount, region, rosterButton);
      card.appendChild(cardBody);
      column.appendChild(card);
      organizationsGrid.appendChild(column);
    });
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
      document.getElementById('contractor-region-filter').value = params.get('region') || '';
      document.getElementById('contractor-country-filter').value = params.get('country') || '';
      document.getElementById('contractor-city-sector-filter').value = params.get('citySector') || '';
      document.getElementById('filter-organization').value = params.get('organization') || 'All';
      directoryQuery = params.get('q') || '';
      document.getElementById('global-search').value = directoryQuery;
      syncSearchChrome();
      switchView('view-contacts', { skipHistory: true });
      renderContactList();
      return;
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
      if (card.dataset.filterStatus === 'Alert' || !loaded) return;
      const status = card.dataset.filterStatus;
      clearContactFilters();
      document.getElementById('filter-status').value = status;
      renderContactList();
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
    if (contactsView.classList.contains('d-none')) renderContactList();
    else {
      renderTable(filterContractors(readContactFilters()));
      switchView('view-contacts', { replaceHistory: true });
    }
  };

  globalSearch?.addEventListener('input', () => {
    directoryQuery = globalSearch.value;
    syncSearchChrome();
    if (directoryQuery.trim() || !contactsView.classList.contains('d-none')) showFilteredDirectory();
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
    organizations.forEach(organization => organizationFilter.add(new Option(organization.name, organization.name)));
    if (regions.includes(selectedRegion)) regionFilter.value = selectedRegion;
    if (organizations.some(organization => organization.name === selectedOrganization)) organizationFilter.value = selectedOrganization;
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
    contractors = [];
    organizations = [];
    loaded = false;
    loading = false;
    loadError = null;
    contactsView.replaceChildren();
    document.getElementById('organizations-grid').replaceChildren();
    document.getElementById('contractor-profile-content').textContent = 'Select a contractor to view profile details.';
    ['view-deployments', 'view-pending-archive', 'view-critical-alerts'].forEach(id => document.getElementById(id).replaceChildren());
    clearContactFilters();
    updateFilterOptions();
    updateDashboardMetricCounts();
    renderRegions();
    document.getElementById('workspace-message').textContent = '';
    window.history.replaceState(null, '', '#/dashboard');
  }

  async function refreshSavedData() {
    if (!window.crmSession?.authenticated) return;
    const generation = ++loadGeneration;
    loading = true;
    loaded = false;
    loadError = null;
    contractors = [];
    organizations = [];
    const refresh = document.getElementById('refresh-contractors');
    refresh.disabled = true;
    const status = document.getElementById('workspace-message');
    status.textContent = 'Loading saved records…';
    updateDashboardMetricCounts();
    renderTable([]);
    renderOrganizations();
    document.getElementById('contractor-profile-content').textContent = 'Loading saved records…';
    try {
      const results = await Promise.all([window.crmApi.listContractors(), window.crmApi.listOrganizations()]);
      if (generation !== loadGeneration || !window.crmSession.authenticated) return;
      [contractors, organizations] = results;
      loaded = true;
      status.textContent = `Loaded ${contractors.length} saved contractor(s).`;
    } catch (error) {
      if (generation !== loadGeneration || !window.crmSession.authenticated) return;
      loadError = error.message;
      status.textContent = error.message;
      if (error.message === 'Login required') {
        await window.crmSession.lock('Session expired. Log in again.');
        return;
      }
    } finally {
      if (generation === loadGeneration) {
        loading = false;
        refresh.disabled = false;
      }
    }
    if (generation !== loadGeneration || !window.crmSession.authenticated) return;
    updateFilterOptions();
    updateDashboardMetricCounts();
    renderRegions();
    renderOrganizations();
    restoreRouteFromUrl();
  }

  window.addEventListener('crm:unlocked', refreshSavedData);
  window.addEventListener('crm:locked', clearSavedData);
  document.getElementById('refresh-contractors').addEventListener('click', refreshSavedData);
  updateFilterOptions();
  updateDashboardMetricCounts();
  renderRegions();
})();
