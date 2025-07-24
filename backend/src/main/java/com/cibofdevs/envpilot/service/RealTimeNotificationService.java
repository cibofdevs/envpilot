package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.DeploymentHistory;
import com.cibofdevs.envpilot.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class RealTimeNotificationService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Send real-time deployment status update
     */
    public void sendDeploymentStatusUpdate(DeploymentHistory deployment) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "deployment_status_update");
        notification.put("deploymentId", deployment.getId());
        notification.put("projectName", deployment.getProject().getName());
        notification.put("environmentName", deployment.getEnvironment().getName());
        notification.put("status", deployment.getStatus());
        notification.put("version", deployment.getVersion());
        notification.put("triggeredBy", deployment.getTriggeredBy().getName());
        notification.put("timestamp", deployment.getCompletedAt() != null ? deployment.getCompletedAt() : deployment.getCreatedAt());

        // Send to all users
        messagingTemplate.convertAndSend("/topic/deployments", notification);
        
        // Send to specific user who triggered the deployment
        messagingTemplate.convertAndSendToUser(
            deployment.getTriggeredBy().getEmail(),
            "/queue/deployments",
            notification
        );

        System.out.println("🔔 Real-time notification sent for deployment: " + deployment.getId());
    }

    /**
     * Send real-time email notification status
     */
    public void sendEmailNotificationStatus(User user, String status, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "email_notification_status");
        notification.put("status", status);
        notification.put("message", message);
        notification.put("timestamp", System.currentTimeMillis());

        // Send to specific user
        messagingTemplate.convertAndSendToUser(
            user.getEmail(),
            "/queue/email-notifications",
            notification
        );

        System.out.println("📧 Real-time email notification status sent to: " + user.getEmail());
    }

    /**
     * Send real-time system alert
     */
    public void sendSystemAlert(String title, String message, String type) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "system_alert");
        notification.put("title", title);
        notification.put("message", message);
        notification.put("alertType", type);
        notification.put("timestamp", System.currentTimeMillis());

        // Send to all users
        messagingTemplate.convertAndSend("/topic/system-alerts", notification);

        System.out.println("🚨 Real-time system alert sent: " + title);
    }
} 