package com.cibofdevs.envpilot.listener;

import com.cibofdevs.envpilot.event.DeploymentStatusEvent;
import com.cibofdevs.envpilot.service.EmailService;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import com.cibofdevs.envpilot.service.RealTimeNotificationService;
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
        
        // Email notification will be handled by Jenkins Build Monitor Service
        System.out.println("📧 Email notification will be handled by Jenkins Build Monitor Service");
    }

    private void handleFailedDeployment(DeploymentStatusEvent event) {
        System.out.println("❌ Processing failed deployment event for: " + event.getDeployment().getId());
        
        // Send real-time deployment status update
        realTimeNotificationService.sendDeploymentStatusUpdate(event.getDeployment());
        
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