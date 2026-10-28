/**
 * Fetch contractors from the Tauri backend and render them into the list table.
 * @param {string} filterJson JSON-encoded contractor filters.
 * @returns {Promise<Array<object>|undefined>} The contractors returned by Rust.
 */
async function fetchContractors(filterJson) {
  try {
    const contractors = await window.__TAURI__.core.invoke('get_contractors', {
      filterJson,
    });

    const tableBody = document.getElementById('contractor-table-body');
    if (!tableBody) {
      throw new Error('Could not find #contractor-table-body.');
    }

    tableBody.replaceChildren();

    for (const contractor of contractors) {
      const row = document.createElement('tr');

      [
        contractor.name,
        contractor.organization,
        contractor.role,
        contractor.region,
      ].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value ?? '';
        row.appendChild(cell);
      });

      const statusCell = document.createElement('td');
      const statusBadge = document.createElement('span');
      const isActive = String(contractor.status ?? '').toLowerCase() === 'active';
      statusBadge.className = `badge ${isActive ? 'bg-success' : 'bg-secondary'}`;
      statusBadge.textContent = contractor.status ?? '';
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      tableBody.appendChild(row);
    }

    return contractors;
  } catch (error) {
    console.error('Failed to fetch contractors:', error);
  }
}
