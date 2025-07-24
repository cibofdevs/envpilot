import notificationService from './notificationService';

class SystemAlertService {
  constructor() {
    this.isEnabled = true;
    this.alertTypes = {
      deployment: 'deployment',
      system: 'system',
      user: 'user',
      project: 'project',
      environment: 'environment'
    };
  }

  // Show general info alert
  showInfo(title, message) {
    if (!this.isEnabled) return;

    notificationService.showSystemAlert(title, message, 'info');
  }

  // Monitor system health (example)
  startSystemMonitoring() {
    // This would typically connect to WebSocket or polling
    // For now, just log that monitoring is active
  }

  // Stop system monitoring
  stopSystemMonitoring() {
    // Stop monitoring
  }
}

// Create singleton instance
const systemAlertService = new SystemAlertService();

export default systemAlertService; 