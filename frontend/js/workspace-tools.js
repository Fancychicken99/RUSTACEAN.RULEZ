// Rendering for authenticated classifications, chronology and retained archives.
(() => {
  const byId = id => document.getElementById(id);
  let snapshot = null, generation = 0, busy = false;
  const element = (tag, text, className = '') => { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; };
  const modal = byId('record-tools-modal');
  function selection() {
    const [kind, id] = byId('record-tools-record').value.split(':');
    return { kind, id: Number(id) };
  }
  function records() {
    return [ ...(window.crmDirectory?.contractors || []).map(record => ({ ...record, kind: 'contractor', name: record.full_name })),
      ...(window.crmDirectory?.organizations || []).map(record => ({ ...record, kind: 'organization' })) ];
  }
  function formatDate(value) {
    const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : value.replace(' ', 'T') + 'Z');
    return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
  }
  function renderSelected() {
    const { kind, id } = selection();
    const record = records().find(item => item.kind === kind && item.id === id);
    const meta = snapshot?.meta.find(item => item.kind === kind && item.id === id);
    byId('record-tools-tags').value = meta?.tags.join(', ') || '';
    byId('record-tools-skills').value = meta?.skills.join(', ') || '';
    const badges = byId('record-tools-badges'); badges.replaceChildren();
    for (const [type, names] of [['Tag', meta?.tags || []], ['Skill', meta?.skills || []]]) for (const name of names) {
      const badge = element('span', `${type}: ${name}`, 'badge record-label me-2 mb-2');
      let hash = 0; for (const char of name.toLowerCase()) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
      badge.dataset.color = String(hash % 4); badges.appendChild(badge);
    }
    const status = byId('record-tools-status'); status.replaceChildren();
    for (const value of kind === 'organization' ? ['Active', 'Inactive', 'Out of Business'] : ['Active', 'Inactive', 'Retired', 'Deceased']) status.add(new Option(value, value));
    status.value = record?.status || 'Active';
    byId('record-tools-transfer-group').hidden = kind !== 'contractor';
    const target = byId('record-tools-transfer'); target.replaceChildren();
    for (const org of window.crmDirectory.organizations) target.add(new Option(org.name, String(org.id)));
    target.value = String(record?.organization_id || '');
    const history = byId('record-tools-history'); history.replaceChildren();
    const entries = (snapshot?.history || []).filter(item => item.kind === kind && item.id === id)
      .map(item => ({ at: item.at, text: `${item.event}: ${item.detail}` }));
    if (kind === 'contractor') for (const contact of snapshot?.contacts || []) if (contact.contractor_id === id) entries.push({ at: contact.contacted_at, text: `${contact.method}: ${contact.note || ''}` });
    const epoch = value => Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : value.replace(' ', 'T') + 'Z');
    entries.sort((a, b) => epoch(b.at) - epoch(a.at));
    for (const entry of entries) history.appendChild(element('li', `${formatDate(entry.at)} — ${entry.text}`, 'mb-3 preserve-lines'));
    if (!entries.length) history.appendChild(element('li', 'No recorded changes or contact notes yet.', 'text-secondary'));
    byId('record-tools-message').textContent = '';
  }
  function renderArchives() {
    const table = byId('archives-table');
    if (window.DataTable?.isDataTable(table)) new DataTable(table).destroy();
    const body = byId('archives-table-body'); body.replaceChildren();
    for (const record of snapshot?.archives || []) {
      const row = document.createElement('tr');
      row.append(element('td', record.name), element('td', record.kind), element('td', formatDate(record.archived_at)));
      const cell = document.createElement('td'); const restore = element('button', 'Restore', 'btn btn-sm btn-outline-primary'); restore.type = 'button';
      restore.addEventListener('click', () => mutate({ action: 'restore', kind: record.kind, id: record.id }));
      cell.appendChild(restore); row.appendChild(cell); body.appendChild(row);
    }
    if (!body.children.length) { const row = document.createElement('tr'), cell = element('td', 'No archived records.', 'text-secondary'); cell.colSpan = 4; row.appendChild(cell); body.appendChild(row); }
    window.crmDataTable(table);
  }
  async function refresh() {
    const token = ++generation;
    if (!window.crmSession?.authenticated) return;
    try {
      const next = await window.crmApi.workspaceSnapshot();
      if (token !== generation || !window.crmSession.authenticated) return;
      snapshot = next; renderArchives();
      const activity = byId('recent-activity');
      if (activity) {
        activity.replaceChildren();
        const names = records();
        const entries = [...next.history.map(item=>({at:item.at,text:(names.find(record=>record.kind===item.kind&&record.id===item.id)?.name || item.kind+' #'+item.id)+' · '+item.event})),...next.contacts.map(item=>({at:item.contacted_at,text:(names.find(record=>record.kind==='contractor'&&record.id===item.contractor_id)?.name || 'Contractor #'+item.contractor_id)+' · '+item.method+' contact'}))];
        const epoch = value=>Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:value.replace(' ','T')+'Z');
        entries.sort((a,b)=>epoch(b.at)-epoch(a.at));
        for (const entry of entries.slice(0,6)) activity.appendChild(element('li',formatDate(entry.at)+' — '+entry.text,'mb-2'));
        if(!entries.length) activity.appendChild(element('li','No recorded activity yet.','text-secondary'));
      }
      window.dispatchEvent(new Event('crm:taxonomy-loaded'));
      for (const [id, values] of [['record-tags-options', next.tags], ['record-skills-options', next.skills]]) {
        const list = byId(id); list.replaceChildren(); for (const value of values) list.appendChild(new Option(value, value));
      }
    } catch (error) { if (token === generation) window.crmNotify(error.message, 'error'); }
  }
  async function mutate(request) {
    if (busy || !window.crmSession?.authenticated) return;
    const token = generation; busy = true;
    modal.querySelector('fieldset').disabled = true;
    try {
      const next = await window.crmApi.workspaceAction(request);
      if (!window.crmSession.authenticated || token !== generation) return;
      snapshot = next;
      await window.crmDirectory.refresh();
      if (!window.crmSession.authenticated) return;
      renderArchives(); if (modal.classList.contains('show')) renderSelected();
      window.crmNotify('Record updated.');
    } catch (error) { byId('record-tools-message').textContent = error.message; window.crmNotify(error.message, 'error'); }
    finally { busy = false; modal.querySelector('fieldset').disabled = false; }
  }
  async function open(kind, id) {
    if (!window.crmSession?.authenticated) return;
    await refresh(); if (!snapshot || !window.crmSession.authenticated) return;
    const select = byId('record-tools-record'); select.replaceChildren();
    for (const record of records()) select.add(new Option(`${record.name} · ${record.kind}`, `${record.kind}:${record.id}`));
    if (kind && id) select.value = `${kind}:${id}`;
    renderSelected(); bootstrap.Modal.getOrCreateInstance(modal).show();
  }
  window.crmWorkspace = Object.freeze({get snapshot(){return snapshot;}});
  byId('open-record-tools').addEventListener('click', () => { bootstrap.Modal.getInstance(byId('settings-modal'))?.hide(); setTimeout(() => open(), 300); });
  byId('record-tools-record').addEventListener('change', renderSelected);
  byId('record-tools-taxonomy').addEventListener('click', () => {
    const split = id => byId(id).value.split(',').map(value => value.trim()).filter(Boolean);
    mutate({ action: 'taxonomy', ...selection(), tags: split('record-tools-tags'), skills: split('record-tools-skills') });
  });
  byId('record-tools-save-status').addEventListener('click', async () => {
    const { kind, id } = selection();
    if (kind === 'organization') return mutate({ action: 'organization_status', id, status: byId('record-tools-status').value });
    try { await window.crmApi.setContractorStatus({ id, status: byId('record-tools-status').value }); await window.crmDirectory.refresh(); await refresh(); renderSelected(); window.crmNotify('Status updated.'); }
    catch (error) { byId('record-tools-message').textContent = error.message; }
  });
  byId('record-tools-transfer-button').addEventListener('click', () => {
    if (window.confirm('Transfer this contractor to the selected organization and record the change in history?')) mutate({ action: 'transfer', id: selection().id, organization_id: Number(byId('record-tools-transfer').value) });
  });
  window.addEventListener('crm:open-record-tools', event => open(event.detail.kind, event.detail.id));
  window.addEventListener('crm:records-loaded', refresh);
  window.addEventListener('crm:locked', () => {
    ++generation; snapshot = null;
    for (const id of ['record-tools-history', 'archives-table-body', 'record-tools-record', 'record-tools-badges', 'record-tools-status', 'record-tools-transfer', 'recent-activity']) byId(id)?.replaceChildren();
    byId('record-tools-tags').value = ''; byId('record-tools-skills').value = '';
    byId('record-tools-message').textContent = '';
    bootstrap.Modal.getInstance(modal)?.hide();
  });
})();
