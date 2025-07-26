import { config } from '../config/config';
import notificationService from './notificationService';

class SystemAlertService {
  constructor() {
    // Check if we're in a Mixed Content situation (HTTPS frontend, HTTP backend)
    const isMixedContent = window.location.protocol === 'https:' && config.API_BASE_URL.startsWith('http://');
    
    this.isEnabled = config.ENABLE_REAL_TIME_NOTIFICATIONS && !isMixedContent;
    this.monitoringInterval = null;
    this.alertTypes = {
      deployment: 'deployment',
      system: 'system',
      user: 'user',
      project: 'project',
      environment: 'environment'
    };
    
    // Initialize monitoring if enabled and not mixed content
    if (this.isEnabled) {
      this.startSystemMonitoring();
    } else if (isMixedContent) {
      console.warn('System monitoring disabled due to Mixed Content: HTTPS frontend cannot connect to HTTP backend');
    }
  }

  // Show general info alert
  showInfo(title, message) {
    if (!this.isEnabled) return;

    if (config.DEBUG_MODE) {
      console.log('System Alert - Info:', title, message);
    }

    notificationService.showSystemAlert(title, message, 'info');
  }

  // Show warning alert
  showWarning(title, message) {
    if (!this.isEnabled) return;

    if (config.DEBUG_MODE) {
      console.warn('System Alert - Warning:', title, message);
    }

    notificationService.showSystemAlert(title, message, 'warning');
  }

  // Show error alert
  showError(title, message) {
    if (!this.isEnabled) return;

    if (config.DEBUG_MODE) {
      console.error('System Alert - Error:', title, message);
    }

    notificationService.showSystemAlert(title, message, 'error');
  }

  // Show success alert
  showSuccess(title, message) {
    if (!this.isEnabled) return;

    if (config.DEBUG_MODE) {
      console.log('System Alert - Success:', title, message);
    }

    notificationService.showSystemAlert(title, message, 'success');
  }

  // Monitor system health
  startSystemMonitoring() {
    if (!this.isEnabled) return;

    // Check system status every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 30000);

    if (config.DEBUG_MODE) {
      console.log('System monitoring started');
    }
  }

  // Stop system monitoring
  stopSystemMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      
      if (config.DEBUG_MODE) {
        console.log('System monitoring stopped');
      }
    }
  }

  // Check system health
  async checkSystemHealth() {
    try {
      // This would typically make an API call to check system status
      // For now, just log that health check is running
      if (config.DEBUG_MODE) {
        console.log('System health check running...');
      }
    } catch (error) {
      this.showError('System Health Check Failed', 'Unable to verify system status');
    }
  }

  // Enable/disable alerts
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled && !this.monitoringInterval) {
      this.startSystemMonitoring();
    } else if (!enabled && this.monitoringInterval) {
      this.stopSystemMonitoring();
    }
  }

  // Get current status
  getStatus() {
    return {
      enabled: this.isEnabled,
      monitoring: this.monitoringInterval !== null,
      realTimeNotifications: notificationService.isRealTimeEnabled()
    };
  }
}

// Create singleton instance
const systemAlertService = new SystemAlertService();

export default systemAlertService; 