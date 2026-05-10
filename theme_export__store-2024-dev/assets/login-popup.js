// LoginRegister App - Theme integration for header account icon
// Opens the custom embed modal via lrOpenModal() defined in loginregister-embed snippet

document.addEventListener('DOMContentLoaded', function() {
  var loginLink = document.getElementById('login-link');
  var signupLink = document.getElementById('signup-link');

  if (loginLink) {
    loginLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof lrOpenModal === 'function') {
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
});