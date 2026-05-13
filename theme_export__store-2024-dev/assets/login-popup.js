// LoginRegister App - Theme integration for header account icon
// Opens the custom embed modal via lrOpenModal() defined in loginregister-embed snippet
// If a customer is already logged in (stored in localStorage as 'lr_customer'),
// the account icon opens the profile view instead of the login form.

(function() {
  function getStoredCustomer() {
    try {
      var raw = localStorage.getItem('lr_customer');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function bind() {
    var loginLink = document.getElementById('login-link');
    var signupLink = document.getElementById('signup-link');

    if (loginLink) {
      loginLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof lrOpenModal !== 'function') return;
        var customer = getStoredCustomer();
        if (customer) {
          lrOpenModal('profile');
        } else {
          lrOpenModal('login');
        }
      });
    }

    if (signupLink) {
      signupLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof lrOpenModal === 'function') {
          lrOpenModal('register');
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();