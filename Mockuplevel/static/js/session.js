(function () {
  'use strict';

  var SESSION_KEY = 'mockuplevel.session.v1';
  var TOKEN_KEY = 'mockuplevel_jwt';

  function getToken() {
    return window.localStorage.getItem(TOKEN_KEY) || null;
  }

  function setToken(token) {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }

  function getUser() {
    var saved = window.localStorage.getItem(SESSION_KEY);
    if (!saved) {
      return null;
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
    getToken: getToken,
    setToken: setToken,

    getUser: function () {
      var user = getUser();
      if (!user) {
        // Fallback default learner for preview if not logged in
        return {
          name: 'Learner',
          email: 'guest@mockuplevel.com',
          avatar: 'L',
          provider: 'guest'
        };
      }
      return user;
    },

    setSession: function (user, token) {
      if (!user || !user.email) {
        throw new Error('An email address is required to start a session.');
      }

      var name = (user.full_name || user.name || '').trim();
      if (!name) {
        var prefix = user.email.split('@')[0];
        name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }

      var sessionObj = {
        id: user.id || null,
        email: user.email.trim(),
        name: name,
        avatar: name.charAt(0).toUpperCase(),
        provider: user.provider || 'email',
        signedInAt: new Date().toISOString()
      };

      window.localStorage.setItem(SESSION_KEY, JSON.stringify(sessionObj));
      if (token) {
        setToken(token);
      }
      return sessionObj;
    },

    signInWithGoogle: function (customEmail, customName) {
      var email = customEmail || prompt('Enter your Google Gmail address:', 'user@gmail.com');
      if (!email || !email.trim()) return null;

      email = email.trim();
      var defaultName = email.split('@')[0];
      defaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      var name = customName || defaultName;

      return this.setSession({
        email: email,
        name: name,
        provider: 'google'
      });
    },

    signOut: function () {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/static/signin.html';
    },

    isSignedIn: function () {
      return Boolean(getToken() && getUser());
    },

    redirectIfSignedIn: function () {
      if (this.isSignedIn()) {
        window.location.replace('/');
      }
    },

    authFetch: async function (url, options) {
      options = options || {};
      options.headers = options.headers || {};
      var token = getToken();

      if (token) {
        if (options.headers instanceof Headers) {
          options.headers.set('Authorization', 'Bearer ' + token);
        } else {
          options.headers['Authorization'] = 'Bearer ' + token;
        }
      }

      var res = await fetch(url, options);
      if (res.status === 401 && token) {
        console.warn('Session expired or unauthorized (401) on:', url);
      }
      return res;
    },

    validateSession: async function () {
      var token = getToken();
      if (!token) return null;

      try {
        var res = await fetch('/api/v1/auth/me', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
          var data = await res.json();
          if (data && data.user) {
            this.setSession(data.user, token);
            this.renderNavigation();
            return data.user;
          }
        } else if (res.status === 401) {
          console.warn('JWT token invalid or expired. Resetting session token.');
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } catch (err) {
        console.warn('Could not validate session:', err);
      }
      return null;
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
      var user = this.getUser();
      var userBadges = document.querySelectorAll('.session-user-name');
      var userAvatars = document.querySelectorAll('.session-user-avatar');
      var userEmails = document.querySelectorAll('.session-user-email');
      var greetingEls = document.querySelectorAll('.session-greeting-text');

      var greeting = this.getTimeGreeting() + ', ' + (user ? user.name : 'Student');

      greetingEls.forEach(function (el) {
        el.innerHTML = greeting + ' <span class="wave-emoji">👋</span>';
      });

      userBadges.forEach(function (el) {
        el.textContent = user ? user.name : 'Guest';
      });

      userEmails.forEach(function (el) {
        el.textContent = user ? user.email : '';
      });

      userAvatars.forEach(function (el) {
        el.textContent = user ? (user.name || user.email || 'U').charAt(0).toUpperCase() : 'U';
      });

      var signoutBtns = document.querySelectorAll('.session-signout-btn');
      signoutBtns.forEach(function (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          if (window.App && typeof window.App.showToast === 'function') {
            window.App.showToast('Signed out successfully', 'info');
          }
          setTimeout(function () {
            window.Session.signOut();
          }, 350);
        };
      });
    }
  };
})();
