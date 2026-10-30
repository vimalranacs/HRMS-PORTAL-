const Notifications = {
  items: [],

  init: async () => {
    try {
      const result = await API.getNotifications();
      Notifications.items = result.notifications || [];
      Notifications.updateBadge();
    } catch (error) {
      console.warn('Notifications could not be loaded:', error.message);
    }
  },

  updateBadge: () => {
    const badge = document.getElementById('notification-count');
    if (!badge) return;
    const count = Notifications.items.filter((item) => !item.read).length;
    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.toggle('d-none', count === 0);
  },

  open: async () => {
    await Notifications.init();
    const container = document.getElementById('notifications-list');
    container.innerHTML = Notifications.items.length ? Notifications.items.map((item) => `
      <button type="button" class="notification-item ${item.read ? '' : 'is-unread'}" onclick='Notifications.markRead(${JSON.stringify(String(item.id))})'>
        <span class="notification-icon"><i class="bi ${item.type === 'leave' ? 'bi-calendar-check' : 'bi-info-circle'}"></i></span>
        <span><strong>${App.escapeHtml(item.title)}</strong><small>${App.escapeHtml(item.message)}</small></span>
      </button>`).join('') : '<div class="empty-state m-4"><div><i class="bi bi-bell"></i><strong>No notifications</strong><span>Account updates will appear here.</span></div></div>';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-notifications')).show();
  },

  markRead: async (id) => {
    const item = Notifications.items.find((entry) => String(entry.id) === String(id));
    if (!item?.read) await API.markNotificationRead(id);
    await Notifications.open();
  },

  markAllRead: async () => {
    await Promise.all(Notifications.items.filter((item) => !item.read).map((item) => API.markNotificationRead(item.id)));
    await Notifications.open();
  }
};
