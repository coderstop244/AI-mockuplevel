/**
 * Mockuplevel - Sign in / Sign up behaviour
 * Frontend only. Replace the setTimeout block in the submit handler with
 * your real API call when the backend auth endpoint is ready.
 */
(function () {
  'use strict';

  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
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
    var confirm = document.getElementById('confirm-password');
    var meter = document.getElementById('password-strength');
    if (!password) return;

    function score(value) {
      var level = 0;
      if (value.length >= 8) level++;
      if (/[A-Z]/.test(value) && /[a-z]/.test(value)) level++;
      if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) level++;
      return value.length ? Math.max(level, 1) : 0;
    }

    function checkMatch() {
      if (!confirm) return;
      confirm.setCustomValidity(
        confirm.value && confirm.value !== password.value ? 'Passwords do not match.' : ''
      );
    }

    password.addEventListener('input', function () {
      if (meter) meter.setAttribute('data-level', String(score(password.value)));
      checkMatch();
    });
    if (confirm) confirm.addEventListener('input', checkMatch);
  }

  function setupForm() {
    var form = document.getElementById('auth-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.querySelector('.btn-label') : null;
      if (btn) btn.disabled = true;
      if (label && btn.getAttribute('data-loading')) {
        label.textContent = btn.getAttribute('data-loading');
      }

      var emailEl = document.getElementById('email');
      var nameEl = document.getElementById('name');
      if (window.Session) {
        window.Session.signIn({
          email: emailEl ? emailEl.value : '',
          name: nameEl ? nameEl.value : ''
        });
      }

      // TODO: replace with a real request, e.g. fetch('/api/v1/auth/login', {...})
      setTimeout(function () {
        window.location.href = form.getAttribute('data-redirect') || '/';
      }, 700);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    setupPasswordToggles();
    setupPasswordChecks();
    setupForm();
  });
})();