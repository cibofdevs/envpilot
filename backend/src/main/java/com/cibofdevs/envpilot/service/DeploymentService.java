package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.DeploymentHistory;
import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.model.Project;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.DeploymentHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class DeploymentService {
    
    // Set for tracking deployments being processed (prevent duplicates)
    private final Set<Long> processingDeployments = Collections.synchronizedSet(new HashSet<>());
    @Autowired
    private DeploymentHistoryRepository deploymentHistoryRepository;

    @Autowired
    private EnvironmentService environmentService;

    @Autowired
    private FeatureFlagService featureFlagService;

    @Autowired
    private JenkinsService jenkinsService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ProjectAssignmentService projectAssignmentService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private RealTimeNotificationService realTimeNotificationService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    public List<DeploymentHistory> getAllDeployments() {
        return deploymentHistoryRepository.findAll();
    }

    public List<DeploymentHistory> getDeploymentsByProjectId(Long projectId) {
        return deploymentHistoryRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    public DeploymentHistory createDeployment(String version, String notes, Project project, Environment environment, User triggeredBy) {
        DeploymentHistory deployment = new DeploymentHistory();
        deployment.setVersion(version);
        deployment.setNotes(notes);
        deployment.setProject(project);
        deployment.setEnvironment(environment);
        deployment.setTriggeredBy(triggeredBy);
        deployment.setStatus(DeploymentHistory.Status.PENDING);
        
        DeploymentHistory savedDeployment = deploymentHistoryRepository.save(deployment);
        
        // Update environment status to deploying
        environmentService.deployToEnvironment(environment.getId(), version);
        
        // Audit logging for deployment creation
        if (featureFlagService.isAuditLoggingEnabled()) {
            System.out.println("📋 AUDIT LOG: Deployment created");
            System.out.println("   User: " + triggeredBy.getName() + " (" + triggeredBy.getEmail() + ")");
            System.out.println("   Project: " + project.getName());
            System.out.println("   Environment: " + environment.getName());
            System.out.println("   Version: " + version);
            System.out.println("   Notes: " + (notes != null ? notes : "-"));
            System.out.println("   Timestamp: " + LocalDateTime.now());
        }
        
        // Trigger actual deployment via Jenkins
        triggerJenkinsDeployment(savedDeployment);
        
        return savedDeployment;
    }

    private void triggerJenkinsDeployment(DeploymentHistory deployment) {
        // Update status to in progress
        deployment.setStatus(DeploymentHistory.Status.IN_PROGRESS);
        deploymentHistoryRepository.save(deployment);
        
        // Note: Actual Jenkins deployment is handled by JenkinsController
        // This method just sets the initial status
        // The actual deployment process will be managed by Jenkins integration
        
        System.out.println("🚀 Deployment triggered for Jenkins");
        System.out.println("   Project: " + deployment.getProject().getName());
        System.out.println("   Environment: " + deployment.getEnvironment().getName());
        System.out.println("   Version: " + deployment.getVersion());
        System.out.println("   User: " + deployment.getTriggeredBy().getName());
    }

    /**
     * Update Jenkins build information for a deployment
     */
    public void updateJenkinsBuildInfo(Long deploymentId, Integer buildNumber, String buildUrl) {
        Optional<DeploymentHistory> deploymentOpt = deploymentHistoryRepository.findById(deploymentId);
        if (deploymentOpt.isPresent()) {
            DeploymentHistory deployment = deploymentOpt.get();
            deployment.setJenkinsBuildNumber(buildNumber);
            deployment.setJenkinsBuildUrl(buildUrl);
            deploymentHistoryRepository.save(deployment);
        }
    }

    /**
     * Get deployments by user
     */
    public List<DeploymentHistory> getDeploymentsByUser(Long userId) {
        return deploymentHistoryRepository.findByTriggeredById(userId);
    }

    /**
     * Update deployment status based on Jenkins build status
     */
    @Transactional
    public void updateDeploymentStatusFromJenkins(Long deploymentId) {
        // Duplicate prevention: check if deployment is already being processed
        if (processingDeployments.contains(deploymentId)) {
            System.out.println("⚠️ Deployment " + deploymentId + " is already being processed, skipping duplicate call");
            return;
        }
        
        // Add deployment to processing set
        processingDeployments.add(deploymentId);
        System.out.println("🔒 Locked deployment " + deploymentId + " for processing");
        
        try {
            Optional<DeploymentHistory> deploymentOpt = deploymentHistoryRepository.findByIdWithEagerLoading(deploymentId);
            if (deploymentOpt.isPresent()) {
                DeploymentHistory deployment = deploymentOpt.get();
                
                System.out.println("🔄 Syncing deployment " + deploymentId + " from Jenkins");
                System.out.println("   Project: " + deployment.getProject().getName());
                System.out.println("   Environment: " + deployment.getEnvironment().getName());
                System.out.println("   Current Status: " + deployment.getStatus());
                System.out.println("   Version: " + deployment.getVersion());
            
            // Get Jenkins build status
            Map<String, Object> buildStatus = jenkinsService.getLastBuildStatus(deployment.getProject());
            
            if ((Boolean) buildStatus.get("success")) {
                String jenkinsResult = (String) buildStatus.get("result");
                Boolean isBuilding = (Boolean) buildStatus.get("building");
                Integer buildNumber = (Integer) buildStatus.get("buildNumber");
                
                System.out.println("   Jenkins Result: " + jenkinsResult);
                System.out.println("   Is Building: " + isBuilding);
                System.out.println("   Build Number: " + buildNumber);
                
                // Determine Jenkins status based on result and building flag
                String jenkinsStatus;
                if (isBuilding != null && isBuilding) {
                    jenkinsStatus = "BUILDING";
                } else if (jenkinsResult != null) {
                    jenkinsStatus = jenkinsResult;
                } else {
                    jenkinsStatus = "UNKNOWN";
                }
                
                System.out.println("   Determined Jenkins Status: " + jenkinsStatus);
                
                // Update deployment status based on Jenkins status
                if ("SUCCESS".equals(jenkinsStatus)) {
                    System.out.println("🎯 Jenkins deployment SUCCESS detected for deployment: " + deployment.getId());
                    System.out.println("   Build Number: " + deployment.getJenkinsBuildNumber());
                    System.out.println("   Project: " + deployment.getProject().getName());
                    System.out.println("   Environment: " + deployment.getEnvironment().getName());
                    
                    // Double-check Jenkins is truly finished before proceeding
                    boolean jenkinsTrulyFinished = false;
                    int retryCount = 0;
                    int maxRetries = 5;
                    
                    while (!jenkinsTrulyFinished && retryCount < maxRetries) {
                        try {
                            System.out.println("🔍 Checking if Jenkins build is truly finished (attempt " + (retryCount + 1) + "/" + maxRetries + ")");
                            
                            // Get current Jenkins status
                            Map<String, Object> currentBuildStatus = jenkinsService.getLastBuildStatus(deployment.getProject());
                            
                            if ((Boolean) currentBuildStatus.get("success")) {
                                String currentResult = (String) currentBuildStatus.get("result");
                                Boolean isCurrentlyBuilding = (Boolean) currentBuildStatus.get("building");
                                Integer currentBuildNumber = (Integer) currentBuildStatus.get("buildNumber");
                                
                                System.out.println("   Current Jenkins Result: " + currentResult);
                                System.out.println("   Is Currently Building: " + isCurrentlyBuilding);
                                System.out.println("   Current Build Number: " + currentBuildNumber);
                                System.out.println("   Expected Build Number: " + deployment.getJenkinsBuildNumber());
                                
                                // Check if the build is truly finished
                                if (isCurrentlyBuilding != null && !isCurrentlyBuilding && 
                                    "SUCCESS".equals(currentResult) && 
                                    currentBuildNumber != null && 
                                    currentBuildNumber.equals(deployment.getJenkinsBuildNumber())) {
                                    
                                    jenkinsTrulyFinished = true;
                                    System.out.println("✅ Jenkins build confirmed as truly finished!");
                                } else {
                                    System.out.println("⏳ Jenkins build still in progress, waiting...");
                                    try {
                                        Thread.sleep(2000); // Wait 2 seconds before retry
                                    } catch (InterruptedException ie) {
                                        System.err.println("❌ Wait interrupted: " + ie.getMessage());
                                        Thread.currentThread().interrupt();
                                        break;
                                    }
                                    retryCount++;
                                }
                            } else {
                                System.out.println("⚠️ Failed to get Jenkins status, retrying...");
                                try {
                                    Thread.sleep(2000);
                                } catch (InterruptedException ie) {
                                    System.err.println("❌ Wait interrupted: " + ie.getMessage());
                                    Thread.currentThread().interrupt();
                                    break;
                                }
                                retryCount++;
                            }
                        } catch (Exception e) {
                            System.err.println("❌ Error checking Jenkins status: " + e.getMessage());
                            try {
                                Thread.sleep(2000);
                            } catch (InterruptedException ie) {
                                System.err.println("❌ Wait interrupted: " + ie.getMessage());
                                Thread.currentThread().interrupt();
                                break;
                            }
                            retryCount++;
                        }
                    }
                    
                    if (!jenkinsTrulyFinished) {
                        System.out.println("⚠️ Could not confirm Jenkins build completion after " + maxRetries + " attempts");
                        System.out.println("   Proceeding with email notification anyway...");
                    }
                    
                    // Now update deployment status
                    String oldStatus = deployment.getStatus().toString();
                    deployment.setStatus(DeploymentHistory.Status.SUCCESS);
                    deployment.setCompletedAt(LocalDateTime.now());
                    
                    // Update environment status to online
                    environmentService.updateEnvironmentStatus(deployment.getEnvironment().getId(), Environment.Status.ONLINE);
                    
                    // Save deployment
                    deploymentHistoryRepository.save(deployment);
                    System.out.println("💾 Deployment status saved to database");
                    
                    // Additional safety delay
                    try {
                        System.out.println("⏳ Final safety delay of 2 seconds...");
                        Thread.sleep(2000);
                        System.out.println("✅ Safety delay completed");
                    } catch (InterruptedException e) {
                        System.err.println("❌ Safety delay interrupted: " + e.getMessage());
                    }
                    
                    // Publish event for real-time processing
                    System.out.println("📢 Publishing SUCCESS event for deployment: " + deployment.getId());
                    eventPublisher.publishEvent(new com.cibofdevs.envpilot.event.DeploymentStatusEvent(
                        this, deployment, oldStatus, "SUCCESS"
                    ));
                    System.out.println("✅ SUCCESS event published successfully");
                    
                    // Create bell notification for successful deployment
                    try {
                        String projectName = deployment.getProject().getName();
                        String envName = deployment.getEnvironment().getName();
                        String version = deployment.getVersion();
                        String buildNumberText = deployment.getJenkinsBuildNumber() != null ? 
                            " (Build #" + deployment.getJenkinsBuildNumber() + ")" : "";
                        
                        notificationService.createNotification(
                            deployment.getTriggeredBy(),
                            "🚀 Deployment Successful",
                            String.format("Deployment of project '%s' to %s with version %s%s has been successfully completed in Jenkins", 
                                projectName, envName, version, buildNumberText),
                            "success"
                        );
                        
                        System.out.println("🔔 Bell notification created for successful deployment");
                        System.out.println("   User: " + deployment.getTriggeredBy().getName());
                        System.out.println("   Project: " + projectName);
                        System.out.println("   Environment: " + envName);
                        System.out.println("   Version: " + version);
                        System.out.println("   Build Number: " + deployment.getJenkinsBuildNumber());
                        
                        // Notify all users assigned to this project
                        try {
                            List<User> assignedUsers = projectAssignmentService.getUsersAssignedToProject(deployment.getProject().getId());
                            for (User assignedUser : assignedUsers) {
                                // Skip if it's the same user who triggered the deployment
                                if (!assignedUser.getId().equals(deployment.getTriggeredBy().getId())) {
                                    notificationService.createNotification(
                                        assignedUser,
                                        "🚀 Deployment Successful",
                                        String.format("Deployment of project '%s' to %s with version %s%s has been successfully completed by %s", 
                                            projectName, envName, version, buildNumberText, deployment.getTriggeredBy().getName()),
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
                    
                } else if ("FAILURE".equals(jenkinsStatus) || "ABORTED".equals(jenkinsStatus) || "UNSTABLE".equals(jenkinsStatus)) {
                    deployment.setStatus(DeploymentHistory.Status.FAILED);
                    deployment.setCompletedAt(LocalDateTime.now());
                    // Update environment status to error
                    environmentService.updateEnvironmentStatus(deployment.getEnvironment().getId(), Environment.Status.ERROR);
                    
                    // Create bell notification for failed deployment
                    try {
                        String projectName = deployment.getProject().getName();
                        String envName = deployment.getEnvironment().getName();
                        String version = deployment.getVersion();
                        String buildNumberText = deployment.getJenkinsBuildNumber() != null ? 
                            " (Build #" + deployment.getJenkinsBuildNumber() + ")" : "";
                        
                        notificationService.createNotification(
                            deployment.getTriggeredBy(),
                            "❌ Deployment Failed",
                            String.format("Deployment of project '%s' to %s with version %s%s failed in Jenkins", 
                                projectName, envName, version, buildNumberText),
                            "error"
                        );
                        
                        System.out.println("🔔 Bell notification created for failed deployment");
                        System.out.println("   User: " + deployment.getTriggeredBy().getName());
                        System.out.println("   Project: " + projectName);
                        System.out.println("   Environment: " + envName);
                        System.out.println("   Version: " + version);
                        System.out.println("   Build Number: " + deployment.getJenkinsBuildNumber());
                        
                        // Notify all users assigned to this project about failure
                        try {
                            List<User> assignedUsers = projectAssignmentService.getUsersAssignedToProject(deployment.getProject().getId());
                            for (User assignedUser : assignedUsers) {
                                // Skip if it's the same user who triggered the deployment
                                if (!assignedUser.getId().equals(deployment.getTriggeredBy().getId())) {
                                    notificationService.createNotification(
                                        assignedUser,
                                        "❌ Deployment Failed",
                                        String.format("Deployment of project '%s' to %s with version %s%s failed by %s", 
                                            projectName, envName, version, buildNumberText, deployment.getTriggeredBy().getName()),
                                        "error"
                                    );
                                }
                            }
                                                    System.out.println("🔔 Notified " + assignedUsers.size() + " users about failed deployment");
                    } catch (Exception e) {
                        System.err.println("❌ Failed to notify project members about failure: " + e.getMessage());
                    }
                    
                    // Send email notification to the user who triggered the deployment
                    if (featureFlagService.isEmailNotificationsEnabled()) {
                        try {
                            emailService.sendDeploymentFailureEmail(deployment.getTriggeredBy(), deployment);
                            System.out.println("📧 Email notification sent to " + deployment.getTriggeredBy().getEmail());
                        } catch (Exception e) {
                            System.err.println("❌ Failed to send email notification: " + e.getMessage());
                        }
                    } else {
                        System.out.println("📧 Email notifications are disabled");
                    }
                        
                    } catch (Exception e) {
                        System.err.println("❌ Failed to create deployment failure notification: " + e.getMessage());
                        // Don't crash the application if notification creation fails
                    }
                    
                } else if ("BUILDING".equals(jenkinsStatus) || "IN_PROGRESS".equals(jenkinsStatus)) {
                    deployment.setStatus(DeploymentHistory.Status.IN_PROGRESS);
                    
                    // Note: No notifications for IN_PROGRESS status
                    // Notifications will only be sent when deployment is completed (SUCCESS/FAILED)
                    System.out.println("⏳ Deployment still in progress - no notifications sent");
                }
                
                // Update build number if available
                if (buildNumber != null) {
                    deployment.setJenkinsBuildNumber(buildNumber);
                }
                
                deploymentHistoryRepository.save(deployment);
            }
        }
        } finally {
            // Always remove deployment from processing set
            processingDeployments.remove(deploymentId);
            System.out.println("🔓 Unlocked deployment " + deploymentId + " from processing");
        }
    }

    /**
     * Update deployment status manually
     */
    public DeploymentHistory updateDeploymentStatus(Long deploymentId, DeploymentHistory.Status status) {
        Optional<DeploymentHistory> deploymentOpt = deploymentHistoryRepository.findById(deploymentId);
        if (deploymentOpt.isPresent()) {
            DeploymentHistory deployment = deploymentOpt.get();
            deployment.setStatus(status);
            
            if (status == DeploymentHistory.Status.SUCCESS || status == DeploymentHistory.Status.FAILED) {
                deployment.setCompletedAt(LocalDateTime.now());
                
                // Update environment status
                if (status == DeploymentHistory.Status.SUCCESS) {
                    environmentService.updateEnvironmentStatus(deployment.getEnvironment().getId(), Environment.Status.ONLINE);
                } else {
                    environmentService.updateEnvironmentStatus(deployment.getEnvironment().getId(), Environment.Status.ERROR);
                }
            }
            
            return deploymentHistoryRepository.save(deployment);
        }
        return null;
    }

    /**
     * Auto-sync all active deployments from Jenkins
     */
    @Transactional
    public void syncAllActiveDeployments() {
        List<DeploymentHistory> activeDeployments = deploymentHistoryRepository.findByStatusInWithEagerLoading(
            List.of(DeploymentHistory.Status.PENDING, DeploymentHistory.Status.IN_PROGRESS)
        );
        
        System.out.println("🔄 Syncing " + activeDeployments.size() + " active deployments from Jenkins");
        
        for (DeploymentHistory deployment : activeDeployments) {
            try {
                updateDeploymentStatusFromJenkins(deployment.getId());
            } catch (Exception e) {
                System.err.println("Error syncing deployment " + deployment.getId() + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    /**
     * Scheduled task to automatically sync deployment status every 15 seconds (ULTRA REAL-TIME)
     */
    @Scheduled(fixedRate = 15000) // 15 seconds = 15,000 milliseconds
    public void scheduledSyncDeployments() {
        try {
            System.out.println("⚡ ULTRA REAL-TIME sync: Checking for deployment status updates...");
            syncAllActiveDeployments();
        } catch (Exception e) {
            System.err.println("❌ Error in scheduled sync: " + e.getMessage());
        }
    }
    
    /**
     * Ultra-fast sync for critical deployments (every 10 seconds)
     */
    @Scheduled(fixedRate = 10000) // 10 seconds = 10,000 milliseconds
    public void ultraFastSyncDeployments() {
        try {
            // Only sync deployments that are very recent (last 5 minutes)
            LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
            List<DeploymentHistory> recentDeployments = deploymentHistoryRepository.findByStatusInAndCreatedAtAfterWithEagerLoading(
                List.of(DeploymentHistory.Status.PENDING, DeploymentHistory.Status.IN_PROGRESS),
                fiveMinutesAgo
            );
            
            if (!recentDeployments.isEmpty()) {
                System.out.println("🚀 ULTRA-FAST sync: Checking " + recentDeployments.size() + " recent deployments...");
                for (DeploymentHistory deployment : recentDeployments) {
                    try {
                        updateDeploymentStatusFromJenkins(deployment.getId());
                    } catch (Exception e) {
                        System.err.println("Error in ultra-fast sync for deployment " + deployment.getId() + ": " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Error in ultra-fast sync: " + e.getMessage());
        }
    }
}
