/**
 * Mockuplevel - Real JWT Authentication Behavior
 */
(function () {
  'use strict';

  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function showAuthAlert(message, type = 'error') {
    var existingAlert = document.getElementById('auth-alert-box');
    if (existingAlert) existingAlert.remove();

    var form = document.getElementById('auth-form');
    if (!form) return;

    var alertBox = document.createElement('div');
    alertBox.id = 'auth-alert-box';
    alertBox.className = type === 'error'
      ? 'p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 mb-4 animate-fade-in'
      : 'p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 mb-4 animate-fade-in';

    var icon = type === 'error' ? 'alert-circle' : 'check-circle';
    alertBox.innerHTML = `
      <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    form.parentNode.insertBefore(alertBox, form);
    renderIcons();
  }

  function setupPasswordToggles() {
    document.querySelectorAll('.field-icon-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.previousElementSibling;
        if (!input || input.tagName !== 'INPUT') return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.innerHTML = '<i data-lucide="' + (show ? 'eye-off' : 'eye') + '" class="w-4 h-4"></i>';
        renderIcons();
      });
    });
  }

  function setupPasswordChecks() {
    var password = document.getElementById('password');
    var meter = document.getElementById('password-strength');
    if (!password) return;

    function score(value) {
      var level = 0;
      if (value.length >= 6) level++;
      if (value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value)) level++;
      if (/[^A-Za-z0-9]/.test(value)) level++;
      return value.length ? Math.max(level, 1) : 0;
    }

    password.addEventListener('input', function () {
      if (meter) meter.setAttribute('data-level', String(score(password.value)));
    });
  }

  function setupForm() {
    var form = document.getElementById('auth-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.querySelector('.btn-label') : null;
      var originalLabel = label ? label.textContent : '';

      if (btn) btn.disabled = true;
      if (label && btn.getAttribute('data-loading')) {
        label.textContent = btn.getAttribute('data-loading');
      }

      var emailEl = document.getElementById('email');
      var passwordEl = document.getElementById('password');
      var nameEl = document.getElementById('name');

      var email = emailEl ? emailEl.value.trim() : '';
      var password = passwordEl ? passwordEl.value : '';
      var fullName = nameEl ? nameEl.value.trim() : '';

      var isSignUp = Boolean(nameEl);
      var endpoint = isSignUp ? '/api/v1/auth/signup' : '/api/v1/auth/signin';
      var payload = isSignUp
        ? { email: email, password: password, full_name: fullName }
        : { email: email, password: password };

      try {
        var res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        var data = await res.json();

        if (!res.ok) {
          var errorMsg = data.detail || 'Authentication failed. Please check your credentials.';
          showAuthAlert(errorMsg, 'error');
          if (btn) btn.disabled = false;
          if (label) label.textContent = originalLabel;
          return;
        }

        // Success!
        if (data.access_token) {
          localStorage.setItem('mockuplevel_jwt', data.access_token);
          window.Session.setSession(data.user, data.access_token);
          showAuthAlert('Success! Redirecting to dashboard...', 'success');
          setTimeout(function () {
            window.location.href = form.getAttribute('data-redirect') || '/';
          }, 600);
        } else if (isSignUp) {
          // Account registered, but confirmation required
          showAuthAlert('Account created successfully! Please sign in.', 'success');
          setTimeout(function () {
            window.location.href = '/static/signin.html';
          }, 1200);
        } else {
          showAuthAlert('Signed in successfully.', 'success');
          setTimeout(function () {
            window.location.href = '/';
          }, 600);
        }

      } catch (err) {
        showAuthAlert('Network or server error: ' + err.message, 'error');
        if (btn) btn.disabled = false;
        if (label) label.textContent = originalLabel;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    setupPasswordToggles();
    setupPasswordChecks();
    setupForm();

    // Only redirect away from auth page if already logged in with a real JWT
    if (window.Session && window.Session.isSignedIn()) {
      var saved = window.Session.getUser();
      if (saved && saved.provider !== 'guest') {
        window.location.replace('/');
      }
    }
  });
})();
