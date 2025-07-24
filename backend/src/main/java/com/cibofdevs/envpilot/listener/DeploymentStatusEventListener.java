package com.cibofdevs.envpilot.listener;

import com.cibofdevs.envpilot.event.DeploymentStatusEvent;
import com.cibofdevs.envpilot.service.EmailService;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import com.cibofdevs.envpilot.service.RealTimeNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class DeploymentStatusEventListener {

    @Autowired
    private EmailService emailService;

    @Autowired
    private FeatureFlagService featureFlagService;

    @Autowired
    private RealTimeNotificationService realTimeNotificationService;

    @EventListener
    @Async
    public void handleDeploymentStatusChange(DeploymentStatusEvent event) {
        System.out.println("🎯 Event: Deployment status changed from " + event.getOldStatus() + " to " + event.getNewStatus());
        System.out.println("   Deployment ID: " + event.getDeployment().getId());
        System.out.println("   Project: " + event.getDeployment().getProject().getName());
        System.out.println("   Triggered By: " + event.getDeployment().getTriggeredBy().getName());
        System.out.println("   Timestamp: " + System.currentTimeMillis());
        
        if ("SUCCESS".equals(event.getNewStatus())) {
            handleSuccessfulDeployment(event);
        } else if ("FAILED".equals(event.getNewStatus())) {
            handleFailedDeployment(event);
        }
    }

    private void handleSuccessfulDeployment(DeploymentStatusEvent event) {
        System.out.println("🚀 Processing successful deployment event for: " + event.getDeployment().getId());
        System.out.println("   Timestamp: " + System.currentTimeMillis());
        System.out.println("   Deployment completed at: " + event.getDeployment().getCompletedAt());
        System.out.println("   Jenkins build number: " + event.getDeployment().getJenkinsBuildNumber());
        
        // Send email notification
        if (featureFlagService.isEmailNotificationsEnabled()) {
            try {
                System.out.println("📧 Sending email notification...");
                emailService.sendDeploymentSuccessEmail(event.getDeployment().getTriggeredBy(), event.getDeployment());
                System.out.println("✅ Email notification sent via event listener");
                
                // Send real-time notification
                realTimeNotificationService.sendEmailNotificationStatus(
                    event.getDeployment().getTriggeredBy(),
                    "success",
                    "Email notification sent successfully for deployment " + event.getDeployment().getId()
                );
            } catch (Exception e) {
                System.err.println("❌ Failed to send email notification via event listener: " + e.getMessage());
                
                // Send real-time error notification
                realTimeNotificationService.sendEmailNotificationStatus(
                    event.getDeployment().getTriggeredBy(),
                    "error",
                    "Failed to send email notification: " + e.getMessage()
                );
            }
        } else {
            System.out.println("⚠️ Email notifications are disabled");
        }
        
        // Send real-time deployment status update
        realTimeNotificationService.sendDeploymentStatusUpdate(event.getDeployment());
    }

    private void handleFailedDeployment(DeploymentStatusEvent event) {
        System.out.println("❌ Processing failed deployment event for: " + event.getDeployment().getId());
        
        // Send email notification for failure
        if (featureFlagService.isEmailNotificationsEnabled()) {
            try {
                emailService.sendDeploymentFailureEmail(event.getDeployment().getTriggeredBy(), event.getDeployment());
                System.out.println("✅ Failure email notification sent via event listener");
            } catch (Exception e) {
                System.err.println("❌ Failed to send failure email notification: " + e.getMessage());
            }
        }
        
        // Send real-time deployment status update
        realTimeNotificationService.sendDeploymentStatusUpdate(event.getDeployment());
    }
} 