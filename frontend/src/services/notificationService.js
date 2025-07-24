class NotificationService {
  constructor() {
    this.permission = 'default';
    this.isSupported = 'Notification' in window;
    this.init();
  }

  init() {
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission === 'granted';
  }

  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Notifications not available or not granted');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        silent: false,
        ...options
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  // Deployment notifications
  async showDeploymentNotification(deployment) {
    const title = `🚀 Deployment ${deployment.status}`;
    const body = `${deployment.project.name} - ${deployment.environment.name}\nVersion: ${deployment.version}`;
    
    return this.showNotification(title, {
      body,
      tag: `deployment-${deployment.id}`,
      data: { type: 'deployment', deployment }
    });
  }

  // System alerts
  async showSystemAlert(title, message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };

    const notificationTitle = `${icons[type]} ${title}`;
    
    return this.showNotification(notificationTitle, {
      body: message,
      tag: `system-${Date.now()}`,
      data: { type: 'system', alertType: type }
    });
  }

  // Project alerts
  async showProjectAlert(project, action, status) {
    const title = `📁 Project ${action}`;
    const body = `${project.name} - ${status}`;
    
    return this.showNotification(title, {
      body,
      tag: `project-${project.id}`,
      data: { type: 'project', project, action, status }
    });
  }

  // Environment alerts
  async showEnvironmentAlert(environment, action, status) {
    const title = `🌍 Environment ${action}`;
    const body = `${environment.name} - ${status}`;
    
    return this.showNotification(title, {
      body,
      tag: `environment-${environment.id}`,
      data: { type: 'environment', environment, action, status }
    });
  }

  // User activity notifications
  async showUserActivityNotification(user, action) {
    const title = `👤 User Activity`;
    const body = `${user.name} ${action}`;
    
    return this.showNotification(title, {
      body,
      tag: `user-${user.id}`,
      data: { type: 'user', user, action }
    });
  }

  // Check if notifications are enabled
  isEnabled() {
    return this.isSupported && this.permission === 'granted';
  }

  // Get permission status
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 