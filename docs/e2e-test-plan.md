# Executable end-to-end test plan

Status: planning only. No executable E2E suite has been implemented or run.

The current checkout contains a frontend prototype, including fixture-backed contact filtering and an add form that logs its payload. It does not contain Rust/Tauri build configuration or a runnable desktop executable. These screens do not establish database persistence. Confirm the repository state again before implementing tests.

## Sprint 1 milestone: MVP ready for E2E testing

The team's goal is a runnable MVP by the end of Sprint 1. Plan to begin executable end-to-end testing at that milestone and expand the suite afterward. Preparing test data, stable selectors, shared contracts, and the build instructions belongs in Sprint 1 so testing can begin when the MVP is available.

The exact MVP feature scope must be agreed by the team against the Statement of Work. The scenario backlog below describes testing priorities, not a claim that every scenario is required for Sprint 1.

At the Sprint 1 handoff, record the build/commit, launch instructions, completed user flows, known issues, and available test-data isolation. Start with launch/navigation and one real create/read/restart flow if supported by the agreed MVP. Record unsupported scenarios as blocked or deferred. After Sprint 1, add coverage for the remaining MVP flows, regressions, errors, and newly developed features.

Use Windows WebDriver automation against the built application, with real Tauri commands and a disposable SQLite database. Do not substitute a browser preview or mocked IPC and call it executable E2E coverage.

Tauri documents WebdriverIO with its Tauri service as the recommended starting point. Select and pin versions after the application's Tauri version and build process are known. The embedded driver requires a test-build plugin; the external tauri-driver route requires a compatible Edge WebDriver on Windows. Keep any test-only backend access out of production builds.

References:

- https://v2.tauri.app/develop/tests/webdriver/
- https://v2.tauri.app/develop/tests/webdriver/manual-setup/

## Integration prerequisites

- A documented build command and known application binary path, distinct from an installer.
- A documented launch flow, including any login or lock screen.
- An agreed IPC contract and working backend commands for each tested feature.
- A test data directory override honored by the backend for both SQLite and images. Use the same directory across a restart within one persistence test and a fresh directory for each independent test.
- Deterministic fixture import/reset that refuses to operate on ordinary user data. Do not assume an environment variable isolates data until the backend actually implements it.
- Stable element IDs or accessible labels for navigation, fields, save actions, errors, and profile selection. Use record IDs to distinguish contractors with similar names.
- A way to wait for completion through visible UI states rather than fixed sleeps.

Connor owns UI selectors and visible loading/error states. Josseline owns database/image isolation and deterministic seeding. Broughnut owns test orchestration, IPC integration, and evidence of results. Coordinate shared decisions in docs/ipc-contract.md when integration begins.

## Scenario backlog

| Priority | User flow | Evidence required | Ready when |
| --- | --- | --- | --- |
| P0 | Launch executable | Dashboard appears; navigation responds | Runnable desktop build |
| P0 | Browse contacts | Seeded records appear with expected names and fields | Real list command and deterministic seed |
| P0 | Filter contacts | Combined region/country/city filters return matching records; clearing restores results; no-match state is visible | Backend filtering wired to UI |
| P0 | Create and restart | Submit a unique fictional record; find it; close and relaunch; reopen and verify stored fields | Create, profile, and persistence wired |
| P0 | Edit and restart | Change that record; relaunch; verify new values | Update wired |
| P0 | Delete and restart | Delete a test record using the normal confirmation flow; relaunch; verify absence | Delete wired |
| P1 | Image persistence | Attach a known image; verify it renders; relaunch and verify it still renders | Image handoff, storage, and display wired |
| P1 | Invalid input | Required fields/invalid email produce a useful message; no record is inserted | Validation and error UI wired |
| P1 | Backend failure | Controlled test failure produces visible error, no false success or mock fallback; recovery permits retry | Safe failure injection and error handling |
| P1 | Dashboard totals | Create/change/delete a test record and verify relevant totals reflect saved data | Real statistics command wired |
| P1 | Profile selection | Selecting a specific record opens that record's details | Profile navigation wired |
| P2 | Offline launch | Packaged app opens and core flows work without internet, if required by the Statement of Work | Assets packaged and offline requirement confirmed |

Fixture-driven frontend filtering can be checked earlier, but label that result as prototype UI coverage. Do not count it as verification of Rust queries. Likewise, a visible lock overlay alone does not prove authentication or data protection.

## Execution and reporting

1. Build the agreed test executable and record its commit, build command, OS, and dependency versions.
2. Create a fresh test directory and seed only fictional records. Run one application instance and serial tests initially to avoid shared database conflicts.
3. Drive clicks, typing, file selection, and assertions through the application's UI. Test setup may seed directly; the behavior under test must use the real bridge and backend.
4. For persistence checks, close the application cleanly, start a new process using the same test directory, and assert the saved result. A page refresh is insufficient.
5. Capture test output and screenshots on failure, plus relevant application/driver logs. Preserve failed test data for diagnosis; clean up only directories known to have been created by the test runner.
6. Report passed, failed, and blocked scenarios separately. A missing executable is a blocked run, not a passing suite. Establish a reliable local run before adding Windows CI.

Start with launch and one create/restart flow. Expand as features become available. Map scenarios to the actual Statement of Work before using the results as acceptance evidence.
