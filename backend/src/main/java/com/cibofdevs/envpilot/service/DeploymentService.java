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
    
    // Set for tracking deployments that have already sent email notifications
    private final Set<Long> emailSentDeployments = Collections.synchronizedSet(new HashSet<>());
    @Autowired
    private DeploymentHistoryRepository deploymentHistoryRepository;

    @Autowired
    private EnvironmentService environmentService;

    @Autowired
    private FeatureFlagService featureFlagService;
    
    @Autowired
    private JenkinsBuildMonitorService jenkinsBuildMonitorService;

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
    @Transactional
    public void updateJenkinsBuildInfo(Long deploymentId, Integer buildNumber, String buildUrl) {
        Optional<DeploymentHistory> deploymentOpt = deploymentHistoryRepository.findById(deploymentId);
        if (deploymentOpt.isPresent()) {
            DeploymentHistory deployment = deploymentOpt.get();
            deployment.setJenkinsBuildNumber(buildNumber);
            deployment.setJenkinsBuildUrl(buildUrl);
            deploymentHistoryRepository.save(deployment);
            System.out.println("💾 Jenkins build info updated for deployment: " + deploymentId);
            System.out.println("   Build Number: " + buildNumber);
            System.out.println("   Build URL: " + buildUrl);
        } else {
            System.err.println("❌ Deployment not found for ID: " + deploymentId);
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
        
        // Email notification prevention: check if email has already been sent
        if (emailSentDeployments.contains(deploymentId)) {
            System.out.println("⚠️ Email notification already sent for deployment " + deploymentId + ", skipping email sending");
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
                    
                    // CRITICAL: Check if Jenkins is still building
                    Boolean isCurrentlyBuilding = (Boolean) buildStatus.get("building");
                    if (isCurrentlyBuilding != null && isCurrentlyBuilding) {
                        System.out.println("❌ CRITICAL: Jenkins is still building! Skipping email notification");
                        System.out.println("   Build is still in progress, will retry later");
                        return; // Exit early, don't send email notification
                    }
                    
                    // CRITICAL: Additional check - ensure build result is not null
                    String currentResult = (String) buildStatus.get("result");
                    if (currentResult == null) {
                        System.out.println("❌ CRITICAL: Build result is null! Skipping email notification");
                        System.out.println("   Build is not truly finished yet");
                        return; // Exit early, don't send email notification
                    }
                    
                    // CRITICAL: Check if build duration is valid (meaning build is truly finished)
                    Long buildDuration = (Long) buildStatus.get("duration");
                    if (buildDuration == null || buildDuration <= 0) {
                        System.out.println("❌ CRITICAL: Build duration is invalid! Skipping email notification");
                        System.out.println("   Build duration: " + buildDuration + "ms");
                        System.out.println("   Build is not truly finished yet");
                        return; // Exit early, don't send email notification
                    }
                    
                    // CRITICAL: Additional verification - check if build number matches
                    Integer currentBuildNumber = (Integer) buildStatus.get("buildNumber");
                    Integer expectedBuildNumber = deployment.getJenkinsBuildNumber();
                    
                    // If deployment doesn't have build number, try to update it
                    if (expectedBuildNumber == null && currentBuildNumber != null) {
                        System.out.println("⚠️ Deployment build number is null, updating with current build number: " + currentBuildNumber);
                        deployment.setJenkinsBuildNumber(currentBuildNumber);
                        deploymentHistoryRepository.save(deployment);
                        expectedBuildNumber = currentBuildNumber;
                    }
                    
                    // More flexible build number verification
                    boolean buildNumberValid = true;
                    if (currentBuildNumber == null) {
                        System.out.println("⚠️ Current build number is null, but continuing with verification");
                        buildNumberValid = false;
                    } else if (expectedBuildNumber == null) {
                        System.out.println("⚠️ Expected build number is null, but continuing with verification");
                        buildNumberValid = false;
                    } else if (!currentBuildNumber.equals(expectedBuildNumber)) {
                        System.out.println("⚠️ Build number mismatch, but continuing with verification");
                        System.out.println("   Current build number: " + currentBuildNumber);
                        System.out.println("   Expected build number: " + expectedBuildNumber);
                        System.out.println("   Deployment ID: " + deployment.getId());
                        buildNumberValid = false;
                    }
                    
                    // Only skip if build number is completely invalid
                    if (!buildNumberValid) {
                        System.out.println("⚠️ Build number verification failed, but continuing with email notification");
                        System.out.println("   This is a fallback to ensure email notifications are sent");
                    }
                    
                    // CRITICAL: Check if build has timestamp (meaning it's truly finished)
                    Long buildTimestamp = (Long) buildStatus.get("timestamp");
                    if (buildTimestamp == null || buildTimestamp <= 0) {
                        System.out.println("❌ CRITICAL: Build timestamp is invalid! Skipping email notification");
                        System.out.println("   Build timestamp: " + buildTimestamp);
                        System.out.println("   Build is not truly finished yet");
                        return; // Exit early, don't send email notification
                    }
                    
                    // CRITICAL: Wait additional time to ensure Jenkins is truly finished
                    try {
                        System.out.println("⏳ CRITICAL: Waiting 5 seconds to ensure Jenkins is 100% complete...");
                        Thread.sleep(5000);
                        System.out.println("✅ Critical wait completed");
                    } catch (InterruptedException e) {
                        System.err.println("❌ Critical wait interrupted: " + e.getMessage());
                        return; // Exit early if interrupted
                    }
                    
                    // CRITICAL: Final verification after wait
                    try {
                        System.out.println("🔍 CRITICAL: Final verification after wait...");
                        Map<String, Object> finalBuildStatus = jenkinsService.getLastBuildStatus(deployment.getProject());
                        
                        if ((Boolean) finalBuildStatus.get("success")) {
                            String finalResult = (String) finalBuildStatus.get("result");
                            Boolean isFinalBuilding = (Boolean) finalBuildStatus.get("building");
                            Integer finalBuildNumber = (Integer) finalBuildStatus.get("buildNumber");
                            Long finalBuildDuration = (Long) finalBuildStatus.get("duration");
                            Long finalBuildTimestamp = (Long) finalBuildStatus.get("timestamp");
                            
                            System.out.println("   Final Jenkins Result: " + finalResult);
                            System.out.println("   Is Final Building: " + isFinalBuilding);
                            System.out.println("   Final Build Number: " + finalBuildNumber);
                            System.out.println("   Final Build Duration: " + finalBuildDuration + "ms");
                            System.out.println("   Final Build Timestamp: " + finalBuildTimestamp);
                            System.out.println("   Expected Build Number: " + expectedBuildNumber);
                            
                            // CRITICAL: Additional check - ensure build is not null
                            if (finalResult == null) {
                                System.out.println("❌ CRITICAL: Final verification failed - Build result is null");
                                System.out.println("   Skipping email notification to prevent premature sending");
                                return; // Exit early, don't send email notification
                            }
                            
                            // CRITICAL: All conditions must be met (with fallback for build number)
                            boolean finalBuildNumberValid = finalBuildNumber != null && 
                                (expectedBuildNumber == null || finalBuildNumber.equals(expectedBuildNumber));
                            
                            // Flexible verification - send email if build is complete or has valid build number
                            boolean buildComplete = (isFinalBuilding != null && !isFinalBuilding) || 
                                                   (finalResult != null && "SUCCESS".equals(finalResult));
                            
                            System.out.println("🔍 Final verification details:");
                            System.out.println("   Build Complete: " + buildComplete);
                            System.out.println("   Final Result: " + finalResult);
                            System.out.println("   Build Number Valid: " + finalBuildNumberValid);
                            System.out.println("   Is Building: " + isFinalBuilding);
                            System.out.println("   Final Build Number: " + finalBuildNumber);
                            
                            // Send email if build is complete and successful
                            if (buildComplete && "SUCCESS".equals(finalResult) && finalBuildNumberValid) {
                                
                                // CRITICAL: Additional check for timestamp
                                if (finalBuildTimestamp != null && finalBuildTimestamp > 0) {
                                    System.out.println("✅ CRITICAL: All verification passed - Jenkins is truly finished!");
                                    System.out.println("   Final build timestamp: " + finalBuildTimestamp);
                                } else {
                                    System.out.println("❌ CRITICAL: Final verification failed - Build timestamp is invalid");
                                    System.out.println("   Final build timestamp: " + finalBuildTimestamp);
                                    System.out.println("   Skipping email notification to prevent premature sending");
                                    return; // Exit early, don't send email notification
                                }
                            } else {
                                System.out.println("❌ CRITICAL: Final verification failed - Jenkins build not truly finished");
                                System.out.println("   Skipping email notification to prevent premature sending");
                                return; // Exit early, don't send email notification
                            }
                        } else {
                            System.out.println("❌ CRITICAL: Final verification failed - could not get Jenkins status");
                            System.out.println("   Skipping email notification to prevent premature sending");
                            return; // Exit early, don't send email notification
                        }
                    } catch (Exception e) {
                        System.err.println("❌ CRITICAL: Final verification error: " + e.getMessage());
                        System.out.println("   Skipping email notification to prevent premature sending");
                        return; // Exit early, don't send email notification
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
                    
                    // Monitor service will handle email notification and event publishing
                    System.out.println("📧 Email notification and event publishing will be handled by Jenkins Build Monitor Service");
                    
                    // Note: Bell notification will be handled by Jenkins Build Monitor Service
                    System.out.println("📧 Bell notification will be handled by Jenkins Build Monitor Service");
                    
                    // IMPORTANT: DeploymentStatusEvent is ONLY published by JenkinsBuildMonitorService
                    // This ensures notifications are sent only when Jenkins build is truly finished
                    System.out.println("📢 DeploymentStatusEvent will be published by JenkinsBuildMonitorService only");
                    
                } else if ("FAILURE".equals(jenkinsStatus) || "ABORTED".equals(jenkinsStatus) || "UNSTABLE".equals(jenkinsStatus)) {
                    System.out.println("❌ Jenkins deployment FAILURE detected for deployment: " + deployment.getId());
                    System.out.println("   Build Number: " + deployment.getJenkinsBuildNumber());
                    System.out.println("   Project: " + deployment.getProject().getName());
                    System.out.println("   Environment: " + deployment.getEnvironment().getName());
                    
                    // Verify Jenkins failure is truly finished before proceeding
                    boolean jenkinsFailureTrulyFinished = false;
                    int failureRetryCount = 0;
                    int maxFailureRetries = 10;
                    
                    while (!jenkinsFailureTrulyFinished && failureRetryCount < maxFailureRetries) {
                        try {
                            System.out.println("🔍 Checking if Jenkins failure is truly finished (attempt " + (failureRetryCount + 1) + "/" + maxFailureRetries + ")");
                            
                            // Get current Jenkins status
                            Map<String, Object> currentFailureStatus = jenkinsService.getLastBuildStatus(deployment.getProject());
                            
                            if ((Boolean) currentFailureStatus.get("success")) {
                                String currentFailureResult = (String) currentFailureStatus.get("result");
                                Boolean isCurrentlyFailureBuilding = (Boolean) currentFailureStatus.get("building");
                                Integer currentFailureBuildNumber = (Integer) currentFailureStatus.get("buildNumber");
                                
                                System.out.println("   Current Jenkins Failure Result: " + currentFailureResult);
                                System.out.println("   Is Currently Failure Building: " + isCurrentlyFailureBuilding);
                                System.out.println("   Current Failure Build Number: " + currentFailureBuildNumber);
                                System.out.println("   Expected Failure Build Number: " + deployment.getJenkinsBuildNumber());
                                
                                // Check if the failure build is truly finished
                                if (isCurrentlyFailureBuilding != null && !isCurrentlyFailureBuilding && 
                                    ("FAILURE".equals(currentFailureResult) || "ABORTED".equals(currentFailureResult) || "UNSTABLE".equals(currentFailureResult)) && 
                                    currentFailureBuildNumber != null && 
                                    currentFailureBuildNumber.equals(deployment.getJenkinsBuildNumber())) {
                                    
                                    jenkinsFailureTrulyFinished = true;
                                    System.out.println("✅ Jenkins failure confirmed as truly finished!");
                                } else {
                                    System.out.println("⏳ Jenkins failure still in progress, waiting...");
                                    try {
                                        Thread.sleep(3000); // Wait 3 seconds before retry
                                    } catch (InterruptedException ie) {
                                        System.err.println("❌ Wait interrupted: " + ie.getMessage());
                                        Thread.currentThread().interrupt();
                                        break;
                                    }
                                    failureRetryCount++;
                                }
                            } else {
                                System.out.println("⚠️ Failed to get Jenkins failure status, retrying...");
                                try {
                                    Thread.sleep(3000);
                                } catch (InterruptedException ie) {
                                    System.err.println("❌ Wait interrupted: " + ie.getMessage());
                                    Thread.currentThread().interrupt();
                                    break;
                                }
                                failureRetryCount++;
                            }
                        } catch (Exception e) {
                            System.err.println("❌ Error checking Jenkins failure status: " + e.getMessage());
                            try {
                                Thread.sleep(3000);
                            } catch (InterruptedException ie) {
                                System.err.println("❌ Wait interrupted: " + ie.getMessage());
                                Thread.currentThread().interrupt();
                                break;
                            }
                            failureRetryCount++;
                        }
                    }
                    
                    if (!jenkinsFailureTrulyFinished) {
                        System.out.println("⚠️ Could not confirm Jenkins failure completion after " + maxFailureRetries + " attempts");
                        System.out.println("   Skipping email notification to ensure Jenkins failure is truly finished");
                        return; // Exit early, don't send email notification
                    }
                    
                    // Additional safety delay for failure
                    try {
                        System.out.println("⏳ Final safety delay of 3 seconds for failure...");
                        Thread.sleep(3000);
                        System.out.println("✅ Safety delay for failure completed");
                    } catch (InterruptedException e) {
                        System.err.println("❌ Safety delay for failure interrupted: " + e.getMessage());
                    }
                    
                    // Final verification for failure
                    try {
                        System.out.println("🔍 Final verification of Jenkins failure completion...");
                        Map<String, Object> finalFailureStatus = jenkinsService.getLastBuildStatus(deployment.getProject());
                        
                        if ((Boolean) finalFailureStatus.get("success")) {
                            String finalFailureResult = (String) finalFailureStatus.get("result");
                            Boolean isFinalFailureBuilding = (Boolean) finalFailureStatus.get("building");
                            Integer finalFailureBuildNumber = (Integer) finalFailureStatus.get("buildNumber");
                            
                            System.out.println("   Final Jenkins Failure Result: " + finalFailureResult);
                            System.out.println("   Is Final Failure Building: " + isFinalFailureBuilding);
                            System.out.println("   Final Failure Build Number: " + finalFailureBuildNumber);
                            System.out.println("   Expected Failure Build Number: " + deployment.getJenkinsBuildNumber());
                            
                            // Flexible verification for failure cases
                            boolean failureBuildComplete = (isFinalFailureBuilding != null && !isFinalFailureBuilding) || 
                                                          (finalFailureResult != null && 
                                                           ("FAILURE".equals(finalFailureResult) || "ABORTED".equals(finalFailureResult) || "UNSTABLE".equals(finalFailureResult)));
                            
                            System.out.println("🔍 Final failure verification details:");
                            System.out.println("   Failure Build Complete: " + failureBuildComplete);
                            System.out.println("   Final Failure Result: " + finalFailureResult);
                            System.out.println("   Failure Build Number Valid: " + (finalFailureBuildNumber != null && finalFailureBuildNumber.equals(deployment.getJenkinsBuildNumber())));
                            System.out.println("   Is Failure Building: " + isFinalFailureBuilding);
                            System.out.println("   Final Failure Build Number: " + finalFailureBuildNumber);
                            
                            // Send failure email if build is complete and failed
                            if (failureBuildComplete && 
                                (finalFailureResult != null && 
                                 ("FAILURE".equals(finalFailureResult) || "ABORTED".equals(finalFailureResult) || "UNSTABLE".equals(finalFailureResult))) &&
                                finalFailureBuildNumber != null && 
                                finalFailureBuildNumber.equals(deployment.getJenkinsBuildNumber())) {
                                
                                System.out.println("✅ Final failure verification successful - Jenkins failure is truly finished!");
                            } else {
                                System.out.println("❌ Final failure verification failed - Jenkins failure not truly finished");
                                System.out.println("   Skipping email notification to prevent premature sending");
                                return; // Exit early, don't send email notification
                            }
                        } else {
                            System.out.println("❌ Final failure verification failed - could not get Jenkins status");
                            System.out.println("   Skipping email notification to prevent premature sending");
                            return; // Exit early, don't send email notification
                        }
                    } catch (Exception e) {
                        System.err.println("❌ Final failure verification error: " + e.getMessage());
                        System.out.println("   Skipping email notification to prevent premature sending");
                        return; // Exit early, don't send email notification
                    }
                    
                    // Now update deployment status for failure
                    String oldFailureStatus = deployment.getStatus().toString();
                    deployment.setStatus(DeploymentHistory.Status.FAILED);
                    deployment.setCompletedAt(LocalDateTime.now());
                    
                    // Update environment status to error
                    environmentService.updateEnvironmentStatus(deployment.getEnvironment().getId(), Environment.Status.ERROR);
                    
                    // Save deployment
                    deploymentHistoryRepository.save(deployment);
                    System.out.println("💾 Failed deployment status saved to database");
                    
                    // Monitor service will handle email notification and event publishing
                    System.out.println("📧 Email notification and event publishing will be handled by Jenkins Build Monitor Service");
                    
                    // Note: Bell notification will be handled by Jenkins Build Monitor Service
                    System.out.println("📧 Bell notification will be handled by Jenkins Build Monitor Service");
                    
                    // IMPORTANT: DeploymentStatusEvent is ONLY published by JenkinsBuildMonitorService
                    // This ensures notifications are sent only when Jenkins build is truly finished
                    System.out.println("📢 DeploymentStatusEvent will be published by JenkinsBuildMonitorService only");
                    
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
     * Scheduled task to automatically sync deployment status every 15 seconds
     */
    @Scheduled(fixedRate = 15000) // 15 seconds = 15,000 milliseconds
    public void scheduledSyncDeployments() {
        try {
            System.out.println("⚡ REAL-TIME sync: Checking for deployment status updates...");
            syncAllActiveDeployments();
        } catch (Exception e) {
            System.err.println("❌ Error in scheduled sync: " + e.getMessage());
        }
    }
    
    /**
     * Fast sync for critical deployments (every 10 seconds)
     */
    @Scheduled(fixedRate = 10000) // 10 seconds = 10,000 milliseconds
    public void fastSyncDeployments() {
        try {
            // Only sync deployments that are very recent (last 5 minutes)
            LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
            List<DeploymentHistory> recentDeployments = deploymentHistoryRepository.findByStatusInAndCreatedAtAfterWithEagerLoading(
                List.of(DeploymentHistory.Status.PENDING, DeploymentHistory.Status.IN_PROGRESS),
                fiveMinutesAgo
            );
            
            if (!recentDeployments.isEmpty()) {
                System.out.println("🚀 FAST sync: Checking " + recentDeployments.size() + " recent deployments...");
                for (DeploymentHistory deployment : recentDeployments) {
                    try {
                        updateDeploymentStatusFromJenkins(deployment.getId());
                    } catch (Exception e) {
                        System.err.println("Error in fast sync for deployment " + deployment.getId() + ": " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Error in fast sync: " + e.getMessage());
        }
    }
    
    /**
     * Cleanup email tracking set every hour to prevent memory leaks
     */
    @Scheduled(fixedRate = 3600000) // 1 hour = 3,600,000 milliseconds
    public void cleanupEmailTracking() {
        try {
            int beforeSize = emailSentDeployments.size();
            emailSentDeployments.clear();
            System.out.println("🧹 Cleaned up email tracking set: " + beforeSize + " entries removed");
        } catch (Exception e) {
            System.err.println("❌ Error in email tracking cleanup: " + e.getMessage());
        }
    }
}
