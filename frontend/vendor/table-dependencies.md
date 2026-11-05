# Locally packaged table and phone-input dependencies

Pinned runtime assets downloaded from upstream distributions:
- jQuery 3.7.1: https://code.jquery.com/jquery-3.7.1.min.js (MIT; jquery/LICENSE.txt)
- DataTables 2.3.4 core, Bootstrap 5 JavaScript and CSS: https://cdn.datatables.net/2.3.4/ (MIT; datatables/LICENSE.txt)
- IMask 7.6.1: https://unpkg.com/imask@7.6.1/dist/imask.min.js (MIT; imask/LICENSE)

Runtime files retain upstream bytes. index.html records SHA384 integrity values.
jQuery must load before DataTables core, followed by its Bootstrap integration.
All assets are local so the existing CSP and offline behavior are preserved.
