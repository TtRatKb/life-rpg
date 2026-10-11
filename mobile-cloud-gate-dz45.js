/* Life RPG DZ45 — mobile cloud gate controller.
 * UI-only except for the explicit, user-requested local-only session escape.
 * Never selects, imports, overwrites or clears a Life RPG save.
 */
(function () {
  'use strict';
  const gate = document.getElementById('mobileCloudGate');
  if (!gate) return;
  const title = document.getElementById('mobileCloudGateTitle');
  const copy = document.getElementById('mobileCloudGateCopy');
  const status = document.getElementById('mobileCloudGateStatus')?.querySelector('strong');
  const hint = document.getElementById('mobileCloudGateHint');
  const signIn = document.getElementById('mobileCloudGateSignIn');
  const local = document.getElementById('mobileCloudGateLocal');
  let closed = false;
  let lastUpdate = null;
  let slow = false;
  const setText = (el, value) => { if (el) el.textContent = value; };
  const toggle = (el, show) => { if (el) el.classList.toggle('hidden', !show); };

  function closeGate() {
    if (closed) return;
    closed = true;
    gate.classList.add('is-hidden-v251');
    gate.setAttribute('aria-hidden', 'true');
    gate.inert = true;
  }

  function render(update) {
    if (closed || window.LifeRPGCloudLocalOnly === true) return;
    lastUpdate = update;
    if (update?.conflict || update?.state === 'conflict') {
      // The actual save-conflict dialog must be accessible instead of hidden
      // behind a full-screen overlay. It owns the decision; never auto-merge.
      closeGate();
      return;
    }
    if (update?.ready || update?.state === 'synced') {
      closeGate();
      return;
    }
    const authSettled = Boolean(update?.authSettled);
    const signedIn = Boolean(update?.uid);
    const failed = update?.state === 'error';
    gate.dataset.state = failed ? 'error' : 'checking';
    setText(title, failed ? 'Cloud check needs attention' : 'Loading your Life RPG…');
    if (authSettled && !signedIn) {
      setText(copy, 'Sign in with your existing Google account to load your cloud save.');
      setText(status, 'Google sign-in needed');
      setText(hint, 'Or continue only with this phone’s current local save. Nothing is deleted.');
      toggle(signIn, true);
      toggle(local, true);
      return;
    }
    toggle(signIn, false);
    if (failed) {
      setText(copy, 'The cloud comparison could not finish. Your local data has not been reset.');
      setText(status, update?.title || 'Cloud unavailable');
      setText(hint, 'You can open this device in local-only mode. Cloud saving will stay paused until you reload.');
      toggle(local, true);
    } else if (slow) {
      setText(copy, 'Google sign-in or cloud comparison is taking longer than expected.');
      setText(status, signedIn ? 'Waiting for cloud save…' : 'Waiting for sign-in…');
      setText(hint, 'If it remains stuck, continue in local-only mode. No cloud save is overwritten.');
      toggle(local, true);
    } else {
      setText(copy, 'Checking whether this phone is connected to your cloud save.');
      setText(status, authSettled ? 'Comparing saves…' : 'Checking sign-in…');
      setText(hint, 'Your local save stays protected while Life RPG checks the cloud.');
      toggle(local, false);
    }
  }

  document.addEventListener('life-rpg:cloud-status', event => render(event.detail));
  signIn?.addEventListener('click', () => {
    const actions = window.LifeRPGCloudActions;
    if (!actions || typeof actions.signIn !== 'function') {
      setText(hint, 'Google sign-in is not loaded yet. Check the connection or open locally.');
      return;
    }
    // Must be invoked synchronously in the real click handler (popup policy).
    void actions.signIn();
  });
  local?.addEventListener('click', () => {
    // Set this before entering the app, including if Firebase has not loaded.
    // cloud-save.js checks this flag before any reconcile or write.
    window.LifeRPGCloudLocalOnly = true;
    window.LifeRPGCloudActions?.enterLocalMode?.();
    closeGate();
    window.LifeRPGApp?.showToast?.('Local mode: cloud save paused for this page. Reload to reconnect.');
  });

  // Do not trap the entire mobile app forever if Firebase is blocked/offline.
  // This only reveals an explicitly opted-in LOCAL-only path; no save is chosen.
  window.setTimeout(() => {
    if (closed) return;
    const snapshot = window.LifeRPGCloudStatus?.snapshot?.();
    if (snapshot?.ready) { closeGate(); return; }
    slow = true;
    render(lastUpdate || (snapshot ? {
      state: 'saving', authSettled: snapshot.settled, uid: snapshot.uid, ready: snapshot.ready
    } : { state: 'saving', authSettled: false, uid: null }));
  }, 10000);
  // If the cloud module initialized before this script (e.g. unusual execution
  // order), take the already-published snapshot as a fallback.
  const initial = window.LifeRPGCloudStatus?.snapshot?.();
  if (initial?.ready) closeGate();
  else if (initial?.settled) render({ state: initial.uid ? 'saving' : 'local', authSettled: true, uid: initial.uid });
})();
