(() => {
  const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
  const overlayId = 'security-lock-overlay';
  let inactivityTimer;

  const overlayStyles = document.createElement('style');
  overlayStyles.textContent = `
    #${overlayId} {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: #f4f5fa;
      color: #232d42;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #${overlayId} .security-lock-panel {
      width: min(100%, 400px);
      padding: 2rem;
      text-align: center;
      background: #fff;
      border: 1px solid #edf0f5;
      border-radius: 1rem;
      box-shadow: 0 12px 40px rgba(17, 38, 146, 0.12);
    }
    #${overlayId} .security-lock-icon {
      display: inline-grid;
      place-items: center;
      width: 58px;
      height: 58px;
      margin-bottom: 1rem;
      color: #3a57e8;
      background: #eef0ff;
      border-radius: 16px;
      font-size: 1.65rem;
    }
    #${overlayId} h2 { margin: 0 0 .5rem; font-size: 1.35rem; }
    #${overlayId} p { margin: 0 0 1.25rem; color: #8a92a6; font-size: .9rem; }
    #${overlayId} input {
      display: block;
      width: 100%;
      margin-bottom: .75rem;
      padding: .7rem .8rem;
      border: 1px solid #dfe3ec;
      border-radius: .55rem;
      font: inherit;
    }
    #${overlayId} input:focus { outline: 3px solid rgba(58, 87, 232, .16); border-color: #3a57e8; }
    #${overlayId} button {
      width: 100%;
      padding: .72rem 1rem;
      color: #fff;
      background: #3a57e8;
      border: 0;
      border-radius: .55rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    #${overlayId} button:hover { background: #304bd2; }
  `;
  document.head.appendChild(overlayStyles);

  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'security-lock-title');
  overlay.innerHTML = `
    <form class="security-lock-panel" id="security-lock-form">
      <div class="security-lock-icon" aria-hidden="true">&#128274;</div>
      <h2 id="security-lock-title">Workspace locked</h2>
      <p>Enter your password to continue.</p>
      <label class="visually-hidden" for="security-lock-password">Password</label>
      <input id="security-lock-password" type="password" autocomplete="current-password" placeholder="Password" required>
      <button type="submit">Unlock</button>
    </form>
  `;
  document.body.appendChild(overlay);

  const passwordInput = document.getElementById('security-lock-password');
  const lockForm = document.getElementById('security-lock-form');

  function lockScreen() {
    overlay.style.display = 'flex';
    passwordInput.value = '';
    passwordInput.focus();
  }

  function resetInactivityTimer() {
    window.clearTimeout(inactivityTimer);
    inactivityTimer = window.setTimeout(lockScreen, LOCK_TIMEOUT_MS);
  }

  ['mousemove', 'click', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, resetInactivityTimer, { passive: true });
  });

  lockForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (passwordInput.value === 'admin123') {
      overlay.style.display = 'none';
      resetInactivityTimer();
    } else {
      window.alert('Incorrect password. Please try again.');
      passwordInput.focus();
    }
  });

  resetInactivityTimer();
})();
