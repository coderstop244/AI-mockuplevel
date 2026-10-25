(function () {
  'use strict';

  var SESSION_KEY = 'mockuplevel.session.v1';

  function getUser() {
    var saved = window.localStorage.getItem(SESSION_KEY);
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.warn('Saved session data is invalid and will be cleared.', error);
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  window.Session = {
    getUser: getUser,

    signIn: function (user) {
      if (!user || !user.email) {
        throw new Error('An email address is required to start a session.');
      }

      window.localStorage.setItem(SESSION_KEY, JSON.stringify({
        email: user.email.trim(),
        name: (user.name || '').trim() || user.email.trim()
      }));
    },

    signOut: function () {
      window.localStorage.removeItem(SESSION_KEY);
      window.location.href = '/static/signin.html';
    },

    redirectIfSignedIn: function () {
      if (getUser()) window.location.replace('/');
    },

    renderNavigation: function () {
      var signIn = document.getElementById('session-signin');
      var userLabel = document.getElementById('session-user');
      var signOut = document.getElementById('session-signout');
      if (!signIn || !userLabel || !signOut) return;

      var user = getUser();
      signIn.classList.toggle('hidden', Boolean(user));
      userLabel.classList.toggle('hidden', !user);
      signOut.classList.toggle('hidden', !user);
      userLabel.textContent = user ? user.name : '';
      signOut.addEventListener('click', this.signOut);
    }
  };
})();
