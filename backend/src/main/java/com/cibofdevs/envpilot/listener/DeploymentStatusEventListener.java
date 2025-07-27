package com.cibofdevs.envpilot.listener;

import com.cibofdevs.envpilot.event.DeploymentStatusEvent;
import com.cibofdevs.envpilot.service.EmailService;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import com.cibofdevs.envpilot.service.RealTimeNotificationService;
import com.cibofdevs.envpilot.service.NotificationService;
import com.cibofdevs.envpilot.service.ProjectAssignmentService;
import com.cibofdevs.envpilot.model.User;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Component
public class DeploymentStatusEventListener {

    @Autowired
    private EmailService emailService;

    @Autowired
    private FeatureFlagService featureFlagService;

    @Autowired
    private RealTimeNotificationService realTimeNotificationService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private ProjectAssignmentService projectAssignmentService;
    
    // Set for tracking email notifications to prevent duplicates
    private final Set<Long> processedEmailDeployments = Collections.synchronizedSet(new HashSet<>());

    @EventListener
    @Async
    public void handleDeploymentStatusChange(DeploymentStatusEvent event) {
        System.out.println("🎯 Event: Deployment status changed from " + event.getOldStatus() + " to " + event.getNewStatus());
        System.out.println("   Deployment ID: " + event.getDeployment().getId());
        System.out.println("   Project: " + event.getDeployment().getProject().getName());
        System.out.println("   Triggered By: " + event.getDeployment().getTriggeredBy().getName());
        System.out.println("   Timestamp: " + System.currentTimeMillis());
        
        // Check if this deployment has already been processed for email
        if (processedEmailDeployments.contains(event.getDeployment().getId())) {
            System.out.println("⚠️ Email already processed for deployment " + event.getDeployment().getId() + ", skipping duplicate email");
            return;
        }
        
        // Mark this deployment as processed
        processedEmailDeployments.add(event.getDeployment().getId());
        System.out.println("📧 Email processing marked for deployment: " + event.getDeployment().getId());
        
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
        
        // Send real-time deployment status update
        realTimeNotificationService.sendDeploymentStatusUpdate(event.getDeployment());
        
        // Create bell notification for successful deployment
        try {
            String projectName = event.getDeployment().getProject().getName();
            String envName = event.getDeployment().getEnvironment().getName();
            String version = event.getDeployment().getVersion();
            String buildNumberText = event.getDeployment().getJenkinsBuildNumber() != null ? 
                " (Build #" + event.getDeployment().getJenkinsBuildNumber() + ")" : "";
            
            notificationService.createNotification(
                event.getDeployment().getTriggeredBy(),
                "🚀 Deployment Successful",
                String.format("Deployment of project '%s' to %s with version %s%s has been successfully completed in Jenkins", 
                    projectName, envName, version, buildNumberText),
                "success"
            );
            
            System.out.println("🔔 Bell notification created for successful deployment");
            System.out.println("   User: " + event.getDeployment().getTriggeredBy().getName());
            System.out.println("   Project: " + projectName);
            System.out.println("   Environment: " + envName);
            System.out.println("   Version: " + version);
            System.out.println("   Build Number: " + event.getDeployment().getJenkinsBuildNumber());
            
            // Notify all users assigned to this project
            try {
                List<User> assignedUsers = projectAssignmentService.getUsersAssignedToProject(event.getDeployment().getProject().getId());
                for (User assignedUser : assignedUsers) {
                    // Skip if it's the same user who triggered the deployment
                    if (!assignedUser.getId().equals(event.getDeployment().getTriggeredBy().getId())) {
                        notificationService.createNotification(
                            assignedUser,
                            "🚀 Deployment Successful",
                            String.format("Deployment of project '%s' to %s with version %s%s has been successfully completed by %s", 
                                projectName, envName, version, buildNumberText, event.getDeployment().getTriggeredBy().getName()),
                            "success"
                        );
                    }
                }
                System.out.println("🔔 Notified " + assignedUsers.size() + " users about successful deployment");
            } catch (Exception e) {
                System.err.println("❌ Failed to notify project members: " + e.getMessage());
            }
            
        } catch (Exception e) {
            System.err.println("❌ Failed to create deployment success notification: " + e.getMessage());
            // Don't crash the application if notification creation fails
        }
        
        // Email notification will be handled by Jenkins Build Monitor Service
        System.out.println("📧 Email notification will be handled by Jenkins Build Monitor Service");
    }

    private void handleFailedDeployment(DeploymentStatusEvent event) {
        System.out.println("❌ Processing failed deployment event for: " + event.getDeployment().getId());
        
        // Send real-time deployment status update
        realTimeNotificationService.sendDeploymentStatusUpdate(event.getDeployment());
        
        // Create bell notification for failed deployment
        try {
            String projectName = event.getDeployment().getProject().getName();
            String envName = event.getDeployment().getEnvironment().getName();
            String version = event.getDeployment().getVersion();
            String buildNumberText = event.getDeployment().getJenkinsBuildNumber() != null ? 
                " (Build #" + event.getDeployment().getJenkinsBuildNumber() + ")" : "";
            
            notificationService.createNotification(
                event.getDeployment().getTriggeredBy(),
                "❌ Deployment Failed",
                String.format("Deployment of project '%s' to %s with version %s%s failed in Jenkins", 
                    projectName, envName, version, buildNumberText),
                "error"
            );
            
            System.out.println("🔔 Bell notification created for failed deployment");
            System.out.println("   User: " + event.getDeployment().getTriggeredBy().getName());
            System.out.println("   Project: " + projectName);
            System.out.println("   Environment: " + envName);
            System.out.println("   Version: " + version);
            System.out.println("   Build Number: " + event.getDeployment().getJenkinsBuildNumber());
            
            // Notify all users assigned to this project about failure
            try {
                List<User> assignedUsers = projectAssignmentService.getUsersAssignedToProject(event.getDeployment().getProject().getId());
                for (User assignedUser : assignedUsers) {
                    // Skip if it's the same user who triggered the deployment
                    if (!assignedUser.getId().equals(event.getDeployment().getTriggeredBy().getId())) {
                        notificationService.createNotification(
                            assignedUser,
                            "❌ Deployment Failed",
                            String.format("Deployment of project '%s' to %s with version %s%s failed by %s", 
                                projectName, envName, version, buildNumberText, event.getDeployment().getTriggeredBy().getName()),
                            "error"
                        );
                    }
                }
                System.out.println("🔔 Notified " + assignedUsers.size() + " users about failed deployment");
            } catch (Exception e) {
                System.err.println("❌ Failed to notify project members about failure: " + e.getMessage());
            }
            
        } catch (Exception e) {
            System.err.println("❌ Failed to create deployment failure notification: " + e.getMessage());
            // Don't crash the application if notification creation fails
        }
        
        // Email notification will be handled by Jenkins Build Monitor Service
        System.out.println("📧 Email notification will be handled by Jenkins Build Monitor Service");
    }
    
    // Cleanup method to prevent memory leaks
    @Scheduled(fixedRate = 3600000) // 1 hour = 3,600,000 milliseconds
    public void cleanupProcessedDeployments() {
        int beforeSize = processedEmailDeployments.size();
        processedEmailDeployments.clear();
        System.out.println("🧹 Cleaned up processed email deployments tracking set");
        System.out.println("   Before cleanup: " + beforeSize + " deployments tracked");
        System.out.println("   After cleanup: 0 deployments tracked");
    }
} 