package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.DeploymentHistory;
import com.cibofdevs.envpilot.model.Project;
import com.cibofdevs.envpilot.repository.DeploymentHistoryRepository;
import com.cibofdevs.envpilot.repository.ProjectRepository;
import com.cibofdevs.envpilot.event.DeploymentStatusEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import java.util.Base64;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class JenkinsBuildMonitorService {

    @Autowired
    private DeploymentHistoryRepository deploymentHistoryRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private FeatureFlagService featureFlagService;

    // Track active deployments that are being monitored
    private final Map<Long, DeploymentMonitor> activeDeployments = new ConcurrentHashMap<>();
    
    // Track build numbers to prevent duplicate processing
    private final Set<String> processedBuilds = ConcurrentHashMap.newKeySet();

    private static class DeploymentMonitor {
        final Long deploymentId;
        final String projectName;
        final String jenkinsJob;
        final String jenkinsUrl;
        final Integer expectedBuildNumber;
        final AtomicInteger checkCount;
        final long startTime;
        
        DeploymentMonitor(Long deploymentId, String projectName, String jenkinsJob, 
                         String jenkinsUrl, Integer expectedBuildNumber) {
            this.deploymentId = deploymentId;
            this.projectName = projectName;
            this.jenkinsJob = jenkinsJob;
            this.jenkinsUrl = jenkinsUrl;
            this.expectedBuildNumber = expectedBuildNumber;
            this.checkCount = new AtomicInteger(0);
            this.startTime = System.currentTimeMillis();
        }
    }

    /**
     * Start monitoring a deployment for build completion
     */
    public void startMonitoring(Long deploymentId, String projectName, String jenkinsJob, 
                               String jenkinsUrl, Integer expectedBuildNumber) {
        DeploymentMonitor monitor = new DeploymentMonitor(deploymentId, projectName, jenkinsJob, 
                                                         jenkinsUrl, expectedBuildNumber);
        activeDeployments.put(deploymentId, monitor);
        
        System.out.println("🔍 Started monitoring deployment: " + deploymentId);
        System.out.println("   Project: " + projectName);
        System.out.println("   Jenkins Job: " + jenkinsJob);
        System.out.println("   Expected Build: " + expectedBuildNumber);
    }

    /**
     * Stop monitoring a deployment
     */
    public void stopMonitoring(Long deploymentId) {
        activeDeployments.remove(deploymentId);
        System.out.println("🔍 Stopped monitoring deployment: " + deploymentId);
    }

    /**
     * Scheduled task to check build status every 10 seconds
     */
    @Scheduled(fixedDelay = 10000) // 10 seconds
    @Transactional
    public void monitorActiveDeployments() {
        if (activeDeployments.isEmpty()) {
            return;
        }

        System.out.println("🔍 Checking " + activeDeployments.size() + " active deployments...");
        
        Iterator<Map.Entry<Long, DeploymentMonitor>> iterator = activeDeployments.entrySet().iterator();
        
        while (iterator.hasNext()) {
            Map.Entry<Long, DeploymentMonitor> entry = iterator.next();
            Long deploymentId = entry.getKey();
            DeploymentMonitor monitor = entry.getValue();
            
            try {
                boolean shouldContinue = checkDeploymentStatus(monitor);
                if (!shouldContinue) {
                    iterator.remove();
                    System.out.println("✅ Monitoring completed for deployment: " + deploymentId);
                }
            } catch (Exception e) {
                System.err.println("❌ Error monitoring deployment " + deploymentId + ": " + e.getMessage());
                // Continue monitoring other deployments
            }
        }
    }

    /**
     * Check the status of a specific deployment
     */
    @Transactional
    protected boolean checkDeploymentStatus(DeploymentMonitor monitor) {
        int checkCount = monitor.checkCount.incrementAndGet();
        long elapsedTime = System.currentTimeMillis() - monitor.startTime;
        
        // Stop monitoring if it's been running for more than 30 minutes
        if (elapsedTime > 30 * 60 * 1000) {
            System.out.println("⏰ Monitoring timeout for deployment: " + monitor.deploymentId);
            return false;
        }
        
        // Stop monitoring if we've checked more than 180 times (30 minutes)
        if (checkCount > 180) {
            System.out.println("⏰ Max check count reached for deployment: " + monitor.deploymentId);
            return false;
        }

        try {
            // Get the latest build status from Jenkins with authentication
            String buildStatusUrl = monitor.jenkinsUrl + "/job/" + monitor.jenkinsJob + "/lastBuild/api/json";
            
                                    // Get project to access Jenkins credentials
                        Optional<Project> projectOpt = projectRepository.findByJenkinsJobName(monitor.jenkinsJob);
                        if (!projectOpt.isPresent()) {
                            System.err.println("❌ Project not found for Jenkins job: " + monitor.jenkinsJob);
                            return true; // Continue monitoring
                        }
                        
                        Project project = projectOpt.get();
                        
                        // Force load project credentials to prevent LazyInitializationException
                        project.getJenkinsUsername();
                        project.getJenkinsToken();
                        
                        // Create authenticated request
                        HttpHeaders headers = new HttpHeaders();
                        if (project.getJenkinsUsername() != null && project.getJenkinsToken() != null) {
                            String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
                            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
                            headers.set("Authorization", "Basic " + encodedAuth);
                        }
                        
                        HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(buildStatusUrl, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode buildInfo = objectMapper.readTree(response.getBody());
                
                boolean isBuilding = buildInfo.path("building").asBoolean(false);
                String result = buildInfo.path("result").asText(null);
                int buildNumber = buildInfo.path("number").asInt(0);
                
                System.out.println("🔍 Deployment " + monitor.deploymentId + " check #" + checkCount + ":");
                System.out.println("   Build Number: " + buildNumber);
                System.out.println("   Is Building: " + isBuilding);
                System.out.println("   Result: " + result);
                System.out.println("   Expected: " + monitor.expectedBuildNumber);
                
                // Check if this is the build we're waiting for
                if (buildNumber == monitor.expectedBuildNumber) {
                                            if (!isBuilding && result != null) {
                            // Build is complete, process the result
                            processBuildCompletionWithTransaction(monitor, buildNumber, result, buildInfo);
                            // Send email notification in separate transaction
                            sendEmailNotification(monitor.deploymentId, buildNumber, result);
                            return false; // Stop monitoring
                        }
                } else if (buildNumber > monitor.expectedBuildNumber) {
                    // A newer build has started, check if our expected build is complete
                    String specificBuildUrl = monitor.jenkinsUrl + "/job/" + monitor.jenkinsJob + 
                                            "/" + monitor.expectedBuildNumber + "/api/json";
                    
                    // Use same authentication for specific build check
                    HttpEntity<String> specificEntity = new HttpEntity<>(headers);
                    ResponseEntity<String> specificResponse = restTemplate.exchange(specificBuildUrl, HttpMethod.GET, specificEntity, String.class);
                    
                    if (specificResponse.getStatusCode().is2xxSuccessful() && specificResponse.getBody() != null) {
                        JsonNode specificBuildInfo = objectMapper.readTree(specificResponse.getBody());
                        boolean specificIsBuilding = specificBuildInfo.path("building").asBoolean(false);
                        String specificResult = specificBuildInfo.path("result").asText(null);
                        
                        if (!specificIsBuilding && specificResult != null) {
                            processBuildCompletionWithTransaction(monitor, monitor.expectedBuildNumber, specificResult, specificBuildInfo);
                            // Send email notification in separate transaction
                            sendEmailNotification(monitor.deploymentId, monitor.expectedBuildNumber, specificResult);
                            return false; // Stop monitoring
                        }
                    }
                }
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error checking build status for deployment " + monitor.deploymentId + ": " + e.getMessage());
            // Continue monitoring even if there's an error
            return true;
        }
        
        return true; // Continue monitoring
    }

    /**
     * Process build completion with transaction support
     */
    @Transactional
    public void processBuildCompletionWithTransaction(DeploymentMonitor monitor, int buildNumber, String result, JsonNode buildInfo) {
        processBuildCompletion(monitor, buildNumber, result, buildInfo);
    }

    /**
     * Send email notification in separate transaction
     */
    @Transactional
    public void sendEmailNotification(Long deploymentId, int buildNumber, String result) {
        try {
            Optional<DeploymentHistory> deploymentOpt = deploymentHistoryRepository.findById(deploymentId);
            if (deploymentOpt.isPresent()) {
                DeploymentHistory deployment = deploymentOpt.get();
                
                // Force load lazy associations
                deployment.getProject().getName();
                deployment.getEnvironment().getName();
                deployment.getTriggeredBy().getEmail();
                
                // Check if email notifications are enabled
                if (featureFlagService.isEmailNotificationsEnabled()) {
                    if ("SUCCESS".equals(result)) {
                        System.out.println("📧 Sending SUCCESS email notification for deployment: " + deploymentId);
                        emailService.sendDeploymentSuccessEmail(deployment.getTriggeredBy(), deployment);
                        System.out.println("✅ SUCCESS email sent successfully for deployment: " + deploymentId);
                    } else if ("FAILURE".equals(result) || "ABORTED".equals(result) || "UNSTABLE".equals(result)) {
                        System.out.println("📧 Sending FAILURE email notification for deployment: " + deploymentId);
                        emailService.sendDeploymentFailureEmail(deployment.getTriggeredBy(), deployment);
                        System.out.println("✅ FAILURE email sent successfully for deployment: " + deploymentId);
                    }
                } else {
                    System.out.println("🚫 Email notifications disabled via feature flag");
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to send email for deployment " + deploymentId + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Process build completion and trigger email notification
     */
    private void processBuildCompletion(DeploymentMonitor monitor, int buildNumber, String result, JsonNode buildInfo) {
        String buildKey = monitor.deploymentId + "-" + buildNumber;
        
        // Prevent duplicate processing
        if (processedBuilds.contains(buildKey)) {
            System.out.println("⚠️ Build " + buildKey + " already processed, skipping");
            return;
        }
        
        processedBuilds.add(buildKey);
        
        System.out.println("🎯 Build completed for deployment: " + monitor.deploymentId);
        System.out.println("   Build Number: " + buildNumber);
        System.out.println("   Result: " + result);
        
        // Update deployment status in database
        Optional<DeploymentHistory> deploymentOpt = deploymentHistoryRepository.findById(monitor.deploymentId);
        if (deploymentOpt.isPresent()) {
            DeploymentHistory deployment = deploymentOpt.get();
            
            // Force load lazy associations to prevent LazyInitializationException
            deployment.getProject().getName();
            deployment.getEnvironment().getName();
            deployment.getTriggeredBy().getEmail();
            
            // Update build info
            deployment.setJenkinsBuildNumber(buildNumber);
            deployment.setJenkinsBuildUrl(buildInfo.path("url").asText());
            
            // Set final status based on result
            if ("SUCCESS".equals(result)) {
                deployment.setStatus(DeploymentHistory.Status.SUCCESS);
                System.out.println("✅ Deployment " + monitor.deploymentId + " marked as SUCCESS");
            } else if ("FAILURE".equals(result) || "ABORTED".equals(result) || "UNSTABLE".equals(result)) {
                deployment.setStatus(DeploymentHistory.Status.FAILED);
                System.out.println("❌ Deployment " + monitor.deploymentId + " marked as FAILED");
            }
            
            deploymentHistoryRepository.save(deployment);
            
            // Email notification will be handled by separate method
            System.out.println("📧 Email notification will be handled by separate transaction");
            
            // Publish event for real-time notification (after email is sent)
            DeploymentStatusEvent event = new DeploymentStatusEvent(
                this,
                deployment,
                "IN_PROGRESS",
                deployment.getStatus().toString()
            );
            
            eventPublisher.publishEvent(event);
            System.out.println("📢 Real-time notification event published for deployment: " + monitor.deploymentId);
        }
    }

    /**
     * Clean up old processed builds (keep only last 100)
     */
    @Scheduled(fixedDelay = 300000) // 5 minutes
    public void cleanupProcessedBuilds() {
        if (processedBuilds.size() > 100) {
            // Keep only the last 50 entries
            List<String> buildsList = new ArrayList<>(processedBuilds);
            processedBuilds.clear();
            processedBuilds.addAll(buildsList.subList(Math.max(0, buildsList.size() - 50), buildsList.size()));
            System.out.println("🧹 Cleaned up processed builds cache");
        }
    }

    /**
     * Get monitoring statistics
     */
    public Map<String, Object> getMonitoringStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("activeDeployments", activeDeployments.size());
        stats.put("processedBuilds", processedBuilds.size());
        stats.put("monitoredDeployments", activeDeployments.keySet());
        return stats;
    }
} 