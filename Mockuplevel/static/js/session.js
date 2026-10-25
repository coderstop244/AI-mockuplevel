(function () {
  'use strict';

  var SESSION_KEY = 'mockuplevel.session.v1';

  function getUser() {
    var saved = window.localStorage.getItem(SESSION_KEY);
    if (!saved) {
      // Default initial learner if none exists yet, so UI immediately looks great like the reference image
      var defaultUser = {
        name: 'Nikhil',
        email: 'nikhil@gmail.com',
        avatar: 'N',
        provider: 'google'
      };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(defaultUser));
      return defaultUser;
    }

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.warn('Saved session data is invalid and will be reset.', error);
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function getUserKey(user, key) {
    var email = (user && user.email) ? user.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guest';
    return 'mockuplevel_user_' + email + '_' + key;
  }

  window.Session = {
    getUser: getUser,

    signIn: function (user) {
      if (!user || !user.email) {
        throw new Error('An email address is required to start a session.');
      }

      var name = (user.name || '').trim();
      if (!name) {
        var prefix = user.email.split('@')[0];
        name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }

      var sessionObj = {
        email: user.email.trim(),
        name: name,
        avatar: name.charAt(0).toUpperCase(),
        provider: user.provider || 'email',
        signedInAt: new Date().toISOString()
      };

      window.localStorage.setItem(SESSION_KEY, JSON.stringify(sessionObj));
      return sessionObj;
    },

    signInWithGoogle: function (customEmail, customName) {
      var email = customEmail || prompt('Enter your Google Gmail address:', 'nikhil@gmail.com');
      if (!email || !email.trim()) return null;

      email = email.trim();
      var defaultName = email.split('@')[0];
      defaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      var name = customName || defaultName;

      return this.signIn({
        email: email,
        name: name,
        provider: 'google'
      });
    },

    signOut: function () {
      window.localStorage.removeItem(SESSION_KEY);
      window.location.reload();
    },

    redirectIfSignedIn: function () {
      // Only redirect away from auth pages if user explicitly logged in
      var saved = window.localStorage.getItem(SESSION_KEY);
      if (saved) {
        window.location.replace('/');
      }
    },

    getUserData: function (key, defaultValue) {
      var user = getUser();
      var storageKey = getUserKey(user, key);
      var item = window.localStorage.getItem(storageKey);
      if (item === null || item === undefined) return defaultValue;
      try {
        return JSON.parse(item);
      } catch (e) {
        return defaultValue;
      }
    },

    setUserData: function (key, value) {
      var user = getUser();
      var storageKey = getUserKey(user, key);
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    },

    getTimeGreeting: function () {
      var hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      return 'Good evening';
    },

    renderNavigation: function () {
      var user = getUser();
      var userBadges = document.querySelectorAll('.session-user-name');
      var userAvatars = document.querySelectorAll('.session-user-avatar');
      var greetingEls = document.querySelectorAll('.session-greeting-text');

      var greeting = this.getTimeGreeting() + ', ' + (user ? user.name : 'Student');

      greetingEls.forEach(function (el) {
        el.innerHTML = greeting + ' <span class="wave-emoji">👋</span>';
      });

      userBadges.forEach(function (el) {
        el.textContent = user ? user.name : 'Guest';
      });

      userAvatars.forEach(function (el) {
        el.textContent = user ? (user.name || user.email || 'U').charAt(0).toUpperCase() : 'U';
      });

      var signoutBtns = document.querySelectorAll('.session-signout-btn');
      signoutBtns.forEach(function (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          if (window.App && typeof window.App.showToast === 'function') {
            window.App.showToast('Signed out of ' + (user ? user.email : 'session'), 'info');
          }
          setTimeout(function () {
            window.localStorage.removeItem(SESSION_KEY);
            window.location.reload();
          }, 350);
        };
      });
    }
  };
})();
