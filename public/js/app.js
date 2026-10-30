// Main Application Controller
const App = {
  currentRole: null,
  currentRoleName: '',
  currentEmployeeId: null,
  currentView: 'dashboard',

  escapeHtml: (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;'),

  getLocalISODate: (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  emptyRow: (colspan, title, message = 'Try adjusting the filters or add a new record.') => `
    <tr>
      <td colspan="${colspan}" class="p-0">
        <div class="empty-state">
          <div>
            <i class="bi bi-inbox" aria-hidden="true"></i>
            <strong>${App.escapeHtml(title)}</strong>
            <span>${App.escapeHtml(message)}</span>
          </div>
        </div>
      </td>
    </tr>
  `,

  init: async () => {
    // Connect existing visual labels to their controls for screen readers.
    document.querySelectorAll('.form-label').forEach((label) => {
      const control = label.parentElement?.querySelector('input, select, textarea');
      if (control?.id && !label.htmlFor) label.htmlFor = control.id;
    });

    // Setup live clock
    App.startClock();

    // Event listeners for forms
    document.getElementById('form-employee')?.addEventListener('submit', Employees.saveEmployee);
    document.getElementById('form-department')?.addEventListener('submit', Departments.saveDepartment);
    document.getElementById('form-attendance')?.addEventListener('submit', Attendance.saveAttendanceForm);
    document.getElementById('form-apply-leave')?.addEventListener('submit', Leaves.submitLeaveApplication);
    document.getElementById('form-generate-payroll')?.addEventListener('submit', Payroll.submitGeneratePayroll);

    await Auth.init();
  },

  startAuthenticated: async (profile) => {
    App.currentRole = profile.role;
    App.currentRoleName = Business.roleLabel(profile.role);
    App.currentEmployeeId = profile.employeeId ? parseInt(profile.employeeId, 10) || profile.employeeId : null;
    App.applyRolePermissions();
    await Notifications.init();
    await App.navigateTo(profile.role === 'employee' ? 'selfservice' : 'dashboard');
  },

  startClock: () => {
    const updateTime = () => {
      const now = new Date();
      const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
      const dateStr = now.toLocaleDateString('en-US', options);
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const el = document.getElementById('topbar-clock');
      if (el) el.innerText = `${dateStr} • ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  applyRolePermissions: () => {
    const roleBadge = document.getElementById('current-role-badge');
    const userNameEl = document.getElementById('current-user-name');

    if (roleBadge) {
      roleBadge.className = 'role-badge-pill';
      if (App.currentRole === 'admin') {
        roleBadge.classList.add('role-admin');
        roleBadge.innerHTML = '<i class="bi bi-shield-lock-fill"></i> System Admin (Full Access)';
        if (userNameEl) userNameEl.innerText = Auth.profile?.displayName || 'System Administrator';
      } else if (App.currentRole === 'hr') {
        roleBadge.classList.add('role-hr');
        roleBadge.innerHTML = '<i class="bi bi-person-badge-fill"></i> HR Manager';
        if (userNameEl) userNameEl.innerText = Auth.profile?.displayName || 'HR Manager';
      } else {
        const name = Auth.profile?.displayName || 'Employee';
        roleBadge.classList.add('role-employee');
        roleBadge.innerHTML = `<i class="bi bi-person-fill"></i> Employee: ${name}`;
        if (userNameEl) userNameEl.innerText = name;
      }
    }

    // Toggle sidebar navigation items based on role
    const adminHrLinks = document.querySelectorAll('.nav-admin-hr');
    const employeeLinks = document.querySelectorAll('.nav-employee-only');

    if (App.currentRole === 'employee') {
      adminHrLinks.forEach(el => el.classList.add('d-none'));
      employeeLinks.forEach(el => el.classList.remove('d-none'));
    } else {
      adminHrLinks.forEach(el => el.classList.remove('d-none'));
      employeeLinks.forEach(el => el.classList.add('d-none'));
    }

    document.querySelectorAll('[data-admin-only]').forEach((element) => element.classList.toggle('d-none', App.currentRole !== 'admin'));
  },

  navigateTo: async (viewName) => {
    if (!Auth.profile) return;
    if (Auth.profile.role === 'employee' && viewName !== 'selfservice') {
      App.showToast('Your account can only access the employee portal.', 'warning');
      viewName = 'selfservice';
    }
    const targetPanel = document.getElementById(`view-${viewName}`);
    if (!targetPanel) {
      App.showToast('That workspace is not available.', 'warning');
      return;
    }

    App.currentView = viewName;

    // Update active class on sidebar
    document.querySelectorAll('.nav-link-custom').forEach(link => {
      link.classList.remove('active');
    });
    document.getElementById(`nav-${viewName}`)?.classList.add('active');

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.add('d-none');
    });

    // Show target view panel
    targetPanel.classList.remove('d-none');
    targetPanel.classList.add('is-loading');
    targetPanel.setAttribute('aria-busy', 'true');

    if (window.innerWidth < 992) {
      document.getElementById('sidebar')?.classList.remove('show');
    }

    // Call view initializer
    try {
      if (viewName === 'dashboard') {
        await Dashboard.init();
      } else if (viewName === 'employees') {
        await Employees.init();
      } else if (viewName === 'departments') {
        await Departments.init();
      } else if (viewName === 'attendance') {
        await Attendance.init();
      } else if (viewName === 'leaves') {
        await Leaves.init();
      } else if (viewName === 'payroll') {
        await Payroll.init();
      } else if (viewName === 'reports') {
        await Reports.init();
      } else if (viewName === 'selfservice') {
        await SelfService.init();
      }
    } catch (err) {
      console.error(`Failed to load ${viewName}:`, err);
      App.showToast(err.message || 'The workspace could not be loaded.', 'danger');
    } finally {
      targetPanel.classList.remove('is-loading');
      targetPanel.removeAttribute('aria-busy');
    }
  },

  showToast: (message, type = 'info') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const safeMessage = App.escapeHtml(message);
    let bgClass = 'bg-primary text-white';
    let icon = 'bi-info-circle-fill';
    if (type === 'success') bgClass = 'bg-success text-white';
    else if (type === 'danger') {
      bgClass = 'bg-danger text-white';
      icon = 'bi-exclamation-octagon-fill';
    }
    else if (type === 'warning') bgClass = 'bg-warning text-dark';
    else if (type === 'info') bgClass = 'bg-info text-dark';
    if (type === 'success') icon = 'bi-check-circle-fill';
    if (type === 'warning') icon = 'bi-exclamation-triangle-fill';

    const toastId = 'toast-' + Date.now();
    const html = `
      <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center gap-2">
            <i class="bi ${icon}"></i>
            <div>${safeMessage}</div>
          </div>
          <button type="button" class="btn-close ${type !== 'warning' && type !== 'info' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled request error:', event.reason);
  App.showToast(event.reason?.message || 'Something went wrong. Please try again.', 'danger');
});
