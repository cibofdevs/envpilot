import { config } from '../config/config';

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.isSupported = 'Notification' in window;
    this.wsConnection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.init();
  }

  init() {
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
    
    // Check if we're in a Mixed Content situation (HTTPS frontend, HTTP backend)
    const isMixedContent = window.location.protocol === 'https:' && config.WS_URL.startsWith('ws://');
    
    // Initialize WebSocket connection for real-time notifications if enabled and not mixed content
    if (config.ENABLE_REAL_TIME_NOTIFICATIONS && !isMixedContent) {
      this.initWebSocket();
    } else if (isMixedContent) {
      console.warn('WebSocket disabled due to Mixed Content: HTTPS frontend cannot connect to HTTP WebSocket');
    }
  }

  initWebSocket() {
    try {
      this.wsConnection = new WebSocket(config.WS_URL + '/ws/notifications');
      
      this.wsConnection.onopen = () => {
        console.log('WebSocket connected for notifications');
        this.reconnectAttempts = 0;
      };
      
      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealTimeNotification(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        this.reconnect();
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.initWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  handleRealTimeNotification(data) {
    switch (data.type) {
      case 'deployment':
        this.showDeploymentNotification(data.deployment);
        break;
      case 'system':
        this.showSystemAlert(data.title, data.message, data.alertType);
        break;
      case 'project':
        this.showProjectAlert(data.project, data.action, data.status);
        break;
      case 'environment':
        this.showEnvironmentAlert(data.environment, data.action, data.status);
        break;
      case 'user':
        this.showUserActivityNotification(data.user, data.action);
        break;
      default:
        console.log('Unknown notification type:', data.type);
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

  // Check if real-time notifications are enabled
  isRealTimeEnabled() {
    return config.ENABLE_REAL_TIME_NOTIFICATIONS && this.wsConnection?.readyState === WebSocket.OPEN;
  }

  // Get permission status
  getPermissionStatus() {
    return this.permission;
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 