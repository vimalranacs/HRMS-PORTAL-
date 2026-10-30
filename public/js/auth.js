const Auth = {
  profile: null,
  user: null,

  init: () => new Promise((resolve) => {
    let started = false;
    let timeoutId;
    const startListener = () => {
      if (started || !window.FirebaseContext) return;
      started = true;
      window.clearTimeout(timeoutId);
      const F = window.FirebaseContext;
      F.onAuthStateChanged(F.auth, async (user) => {
      Auth.user = user;
      if (!user) {
        Auth.profile = null;
        document.body.classList.add('auth-required');
        document.body.classList.remove('app-ready');
        Auth.setMessage('Sign in with your organization account.', '');
        resolve(null);
        return;
      }

      try {
        const snapshot = await F.getDoc(F.doc(F.db, 'users', user.uid));
        if (!snapshot.exists()) throw new Error('Your account has not been provisioned. Ask an administrator to create your user profile.');
        const profile = snapshot.data();
        if (profile.status !== 'active') throw new Error('This account is inactive. Contact your administrator.');
        if (!['admin', 'hr', 'employee'].includes(profile.role)) throw new Error('This account has an invalid role configuration.');
        Auth.profile = { id: snapshot.id, ...profile };
        document.body.classList.remove('auth-required');
        document.body.classList.add('app-ready');
        document.getElementById('auth-password').value = '';
        await App.startAuthenticated(Auth.profile);
        resolve(Auth.profile);
      } catch (error) {
        await F.signOut(F.auth);
        Auth.setMessage(error.message, 'danger');
        resolve(null);
      }
      });
    };

    if (window.FirebaseContext) {
      startListener();
    } else {
      window.addEventListener('firebase-ready', startListener, { once: true });
      timeoutId = window.setTimeout(() => {
        if (started) return;
        Auth.showStartupError();
        resolve(null);
      }, 8000);
    }
  }),

  login: async (event) => {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const button = document.getElementById('auth-submit');
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in…';
    Auth.setMessage('', '');
    try {
      await FirebaseContext.signInWithEmailAndPassword(FirebaseContext.auth, email, password);
    } catch (error) {
      const friendly = {
        'auth/invalid-credential': 'The email or password is incorrect.',
        'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
        'auth/user-disabled': 'This sign-in account has been disabled.',
        'auth/network-request-failed': 'Network error. Check your internet connection.'
      }[error.code] || 'Sign-in failed. Check your details and try again.';
      Auth.setMessage(friendly, 'danger');
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Sign in securely';
    }
  },

  resetPassword: async () => {
    const email = document.getElementById('auth-email').value.trim();
    if (!email) return Auth.setMessage('Enter your email address first.', 'warning');
    try {
      await FirebaseContext.sendPasswordResetEmail(FirebaseContext.auth, email);
      Auth.setMessage('Password reset email sent. Check your inbox.', 'success');
    } catch (error) {
      Auth.setMessage('The reset email could not be sent. Verify the address and try again.', 'danger');
    }
  },

  logout: async () => {
    if (window.FirebaseContext) await FirebaseContext.signOut(FirebaseContext.auth);
  },

  togglePassword: () => {
    const input = document.getElementById('auth-password');
    const icon = document.querySelector('#auth-password-toggle i');
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.className = input.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
  },

  setMessage: (message, type) => {
    const element = document.getElementById('auth-message');
    if (!element) return;
    element.className = type ? `alert alert-${type} py-2 small` : 'd-none';
    element.textContent = message;
  },

  showStartupError: () => {
    document.body.classList.add('auth-required');
    const missing = document.documentElement.dataset.firebase === 'unconfigured';
    Auth.setMessage(missing
      ? 'This deployment is missing its Firebase project configuration. Contact the site administrator.'
      : 'The sign-in service did not load. Refresh the page; if this continues, check your browser connection or extensions.', 'warning');
    document.querySelectorAll('#auth-form input, #auth-form button').forEach((element) => { element.disabled = true; });
  }
};
