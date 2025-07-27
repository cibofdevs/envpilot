package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.model.Project;
import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.service.JenkinsService;
import com.cibofdevs.envpilot.service.ProjectService;
import com.cibofdevs.envpilot.service.EnvironmentService;
import com.cibofdevs.envpilot.service.NotificationService;
import com.cibofdevs.envpilot.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import com.cibofdevs.envpilot.service.UserDetailsServiceImpl;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import com.cibofdevs.envpilot.service.DeploymentService;
import com.cibofdevs.envpilot.repository.ProjectRepository;
import java.time.LocalDateTime;
import com.cibofdevs.envpilot.model.DeploymentHistory;
import com.cibofdevs.envpilot.repository.DeploymentHistoryRepository;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/jenkins")
@Tag(name = "Jenkins", description = "Jenkins integration APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class JenkinsController {

    @Autowired
    private JenkinsService jenkinsService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private EnvironmentService environmentService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeatureFlagService featureFlagService;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private DeploymentService deploymentService;

    @Autowired
    private DeploymentHistoryRepository deploymentHistoryRepository;

    /**
     * Trigger Jenkins deployment for a project
     */
    @PostMapping("/deploy/{projectId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Trigger Jenkins Deployment",
        description = "Trigger Jenkins deployment for a specific project and environment. Admin access required."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Jenkins deployment triggered successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @io.swagger.v3.oas.annotations.media.ExampleObject(
                        name = "Success",
                        value = "{\"success\": true, \"message\": \"Jenkins job triggered successfully\", \"buildNumber\": 123}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid request or project/environment not found"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - Admin role required or environment access restricted"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Project not found"
        )
    })
    public ResponseEntity<Map<String, Object>> deployProject(
            @Parameter(description = "Project ID", example = "1") @PathVariable Long projectId,
            @Parameter(description = "Environment ID", example = "1") @RequestParam Long environmentId,
            @Parameter(description = "Version to deploy", example = "1.0.0") @RequestParam(required = false) String version,
            @Parameter(description = "Deployment notes", example = "Production deployment") @RequestParam(required = false) String notes,
            Authentication authentication) {

        Optional<Project> projectOpt = projectService.getProjectById(projectId);
        Optional<Environment> environmentOpt = environmentService.getEnvironmentById(environmentId);

        if (projectOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Project not found");
            return ResponseEntity.notFound().build();
        }

        if (environmentOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Environment not found");
            return ResponseEntity.badRequest().body(error);
        }

        // Validate deployment access based on role and environment
        String environmentName = environmentOpt.get().getName().toLowerCase();
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Only ADMIN can deploy to staging and production
        if ((environmentName.equals("staging") || environmentName.equals("production")) && 
            userRole != User.Role.ADMIN) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Access denied. Only Admin can deploy to " + environmentName + " environment.");
            return ResponseEntity.status(403).body(error);
        }

        // Get current user
        String userEmail = authentication.getName();
        Optional<User> currentUserOpt = userRepository.findByEmail(userEmail);
        if (currentUserOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "User not found");
            return ResponseEntity.badRequest().body(error);
        }
        User currentUser = currentUserOpt.get();

        Map<String, Object> result = jenkinsService.triggerJenkinsJob(
            projectOpt.get(),
            environmentOpt.get(),
            version,
            notes,
            environmentOpt.get().getName(),
            currentUser
        );

        if ((Boolean) result.get("success")) {
            // Note: Bell notification will only be created when deployment is completed (SUCCESS/FAILED)
            // to avoid spam notifications during trigger phase
            System.out.println("📧 Bell notification will be created when deployment completes");
            
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Get last build status for a project
     */
    @GetMapping("/status/{projectId}")
    public ResponseEntity<Map<String, Object>> getBuildStatus(@PathVariable Long projectId, Authentication authentication) {
        Optional<Project> projectOpt = projectService.getProjectById(projectId);

        if (projectOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Project not found");
            return ResponseEntity.notFound().build();
        }

        // Check user access to project
        Project project = projectOpt.get();
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Admin can access all projects
        if (userRole != User.Role.ADMIN) {
            // Check if user is assigned to this project
            Long userId = userPrincipal.getId();
            List<Project> userProjects = projectRepository.findProjectsByUserId(userId);
            boolean hasAccess = userProjects.stream()
                .anyMatch(userProject -> userProject.getId().equals(projectId));
            
            if (!hasAccess) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Access denied. You don't have permission to access this project's build status.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
        }

        Map<String, Object> result = jenkinsService.getLastBuildStatus(project);

        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Test Jenkins connection for a project
     */
    @PostMapping("/test/{projectId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> testConnection(@PathVariable Long projectId) {
        Optional<Project> projectOpt = projectService.getProjectById(projectId);

        if (projectOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Project not found");
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> result = jenkinsService.testJenkinsConnection(projectOpt.get());

        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Update Jenkins configuration for a project
     */
    @PutMapping("/config/{projectId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateJenkinsConfig(
            @PathVariable Long projectId,
            @RequestBody Map<String, String> jenkinsConfig) {

        Optional<Project> projectOpt = projectService.getProjectById(projectId);

        if (projectOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Project not found");
            return ResponseEntity.notFound().build();
        }

        Project project = projectOpt.get();

        // Update Jenkins configuration
        if (jenkinsConfig.containsKey("jenkinsUrl")) {
            project.setJenkinsUrl(jenkinsConfig.get("jenkinsUrl"));
        }
        if (jenkinsConfig.containsKey("jenkinsJobName")) {
            project.setJenkinsJobName(jenkinsConfig.get("jenkinsJobName"));
        }
        if (jenkinsConfig.containsKey("jenkinsUsername")) {
            project.setJenkinsUsername(jenkinsConfig.get("jenkinsUsername"));
        }
        if (jenkinsConfig.containsKey("jenkinsToken")) {
            project.setJenkinsToken(jenkinsConfig.get("jenkinsToken"));
        }

        Project updatedProject = projectService.updateProject(project);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Jenkins configuration updated successfully");
        result.put("project", updatedProject);

        return ResponseEntity.ok(result);
    }

    /**
     * Get build logs for a project
     */
    @GetMapping("/logs/{projectId}")
    public ResponseEntity<Map<String, Object>> getBuildLogs(
            @PathVariable Long projectId,
            @RequestParam(required = false) Integer buildNumber,
            Authentication authentication) {
        Optional<Project> projectOpt = projectService.getProjectById(projectId);

        if (projectOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Project not found");
            return ResponseEntity.notFound().build();
        }

        // Check user access to project
        Project project = projectOpt.get();
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Admin can access all projects
        if (userRole != User.Role.ADMIN) {
            // Check if user is assigned to this project
            Long userId = userPrincipal.getId();
            List<Project> userProjects = projectRepository.findProjectsByUserId(userId);
            boolean hasAccess = userProjects.stream()
                .anyMatch(userProject -> userProject.getId().equals(projectId));
            
            if (!hasAccess) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Access denied. You don't have permission to access this project's build logs.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
        }

        Map<String, Object> result = jenkinsService.getBuildLogs(project, buildNumber);

        if ((Boolean) result.get("success")) {
            // Audit logging for build logs access
            if (featureFlagService.isAuditLoggingEnabled()) {
                String userEmail = authentication.getName();
                Optional<User> currentUserOpt = userRepository.findByEmail(userEmail);
                if (currentUserOpt.isPresent()) {
                    System.out.println("📋 AUDIT LOG: Build logs accessed");
                    System.out.println("   User: " + currentUserOpt.get().getName() + " (" + userEmail + ")");
                    System.out.println("   Project: " + projectOpt.get().getName() + " (ID: " + projectId + ")");
                    System.out.println("   Build Number: " + (buildNumber != null ? buildNumber : "Latest"));
                    System.out.println("   Timestamp: " + LocalDateTime.now());
                }
            }
            
            return ResponseEntity.ok(result);
        } else {
            // Better error handling - return appropriate status code
            String message = (String) result.get("message");
            if (message != null && message.contains("configuration is incomplete")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            } else if (message != null && message.contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
            }
        }
    }

    /**
     * Get recent builds for a project
     */
    @GetMapping("/builds/{projectId}")
    public ResponseEntity<Map<String, Object>> getRecentBuilds(
            @PathVariable Long projectId,
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            Authentication authentication) {
        Optional<Project> projectOpt = projectService.getProjectById(projectId);

        if (projectOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Project not found");
            return ResponseEntity.notFound().build();
        }

        // Check user access to project
        Project project = projectOpt.get();
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Admin can access all projects
        if (userRole != User.Role.ADMIN) {
            // Check if user is assigned to this project
            Long userId = userPrincipal.getId();
            List<Project> userProjects = projectRepository.findProjectsByUserId(userId);
            boolean hasAccess = userProjects.stream()
                .anyMatch(userProject -> userProject.getId().equals(projectId));
            
            if (!hasAccess) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Access denied. You don't have permission to access this project's builds.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
        }

        Map<String, Object> result = jenkinsService.getRecentBuilds(project, limit);

        if ((Boolean) result.get("success")) {
            // Audit logging for recent builds access
            if (featureFlagService.isAuditLoggingEnabled()) {
                String userEmail = authentication.getName();
                Optional<User> currentUserOpt = userRepository.findByEmail(userEmail);
                if (currentUserOpt.isPresent()) {
                    System.out.println("📋 AUDIT LOG: Recent builds accessed");
                    System.out.println("   User: " + currentUserOpt.get().getName() + " (" + userEmail + ")");
                    System.out.println("   Project: " + projectOpt.get().getName() + " (ID: " + projectId + ")");
                    System.out.println("   Limit: " + limit);
                    System.out.println("   Timestamp: " + LocalDateTime.now());
                }
            }
            
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Get Jenkins configuration for a project (without sensitive data)
     */
    @GetMapping("/config/{projectId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getJenkinsConfig(@PathVariable Long projectId) {
        Optional<Project> projectOpt = projectService.getProjectById(projectId);

        if (projectOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Project not found");
            return ResponseEntity.notFound().build();
        }

        Project project = projectOpt.get();
        Map<String, Object> config = new HashMap<>();
        config.put("jenkinsUrl", project.getJenkinsUrl());
        config.put("jenkinsJobName", project.getJenkinsJobName());
        config.put("jenkinsUsername", project.getJenkinsUsername());
        // Don't return the token for security reasons
        config.put("hasJenkinsToken", project.getJenkinsToken() != null && !project.getJenkinsToken().trim().isEmpty());

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("config", config);

        return ResponseEntity.ok(result);
    }

    /**
     * Sync deployment status from Jenkins
     */
    @PostMapping("/sync-deployment/{deploymentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'QA')")
    @Operation(
        summary = "Sync Deployment Status",
        description = "Sync deployment status from Jenkins for a specific deployment"
    )
    public ResponseEntity<Map<String, Object>> syncDeploymentStatus(
            @PathVariable Long deploymentId,
            Authentication authentication) {
        
        try {
            deploymentService.updateDeploymentStatusFromJenkins(deploymentId);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Deployment status synced successfully");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to sync deployment status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Auto-sync all active deployments from Jenkins
     */
    @PostMapping("/sync-all-deployments")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'QA')")
    @Operation(
        summary = "Sync All Active Deployments",
        description = "Auto-sync all active deployments from Jenkins"
    )
    public ResponseEntity<Map<String, Object>> syncAllDeployments(Authentication authentication) {
        try {
            deploymentService.syncAllActiveDeployments();
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "All active deployments synced successfully");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to sync deployments: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Real-time sync for specific deployment (immediate)
     */
    @PostMapping("/sync-deployment-realtime/{deploymentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'QA')")
    @Operation(
        summary = "Real-Time Sync Deployment",
        description = "Immediately sync deployment status from Jenkins (real-time)"
    )
    public ResponseEntity<Map<String, Object>> syncDeploymentRealtime(
            @PathVariable Long deploymentId,
            Authentication authentication) {
        
        try {
            System.out.println("🚀 REAL-TIME sync requested for deployment: " + deploymentId);
            deploymentService.updateDeploymentStatusFromJenkins(deploymentId);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Deployment synced in real-time successfully");
            result.put("deploymentId", deploymentId);
            result.put("timestamp", LocalDateTime.now().toString());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to sync deployment in real-time: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Jenkins Webhook endpoint for real-time build notifications
     */
    @PostMapping("/webhook")
    @Operation(
        summary = "Jenkins Webhook",
        description = "Receive real-time notifications from Jenkins when builds complete"
    )
    public ResponseEntity<Map<String, Object>> jenkinsWebhook(@RequestBody Map<String, Object> webhookData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("🔔 Jenkins Webhook received!");
            System.out.println("   Webhook data: " + webhookData);
            
            // Extract build information from webhook
            String jobName = (String) webhookData.get("name");
            
            // Handle nested build object
            Object buildObj = webhookData.get("build");
            String buildStatus = null;
            Integer buildNumber = null;
            String buildUrl = null;
            
            if (buildObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> build = (Map<String, Object>) buildObj;
                buildStatus = (String) build.get("status");
                buildNumber = (Integer) build.get("number");
                buildUrl = (String) build.get("url");
            }
            
            System.out.println("   Job Name: " + jobName);
            System.out.println("   Build Status: " + buildStatus);
            System.out.println("   Build Number: " + buildNumber);
            System.out.println("   Build URL: " + buildUrl);
            
            // Find project by Jenkins job name
            Optional<Project> projectOpt = projectRepository.findByJenkinsJobName(jobName);
            if (projectOpt.isPresent()) {
                Project project = projectOpt.get();
                
                // Find active deployment for this project and build number
                List<DeploymentHistory> activeDeployments = deploymentHistoryRepository.findByProjectAndJenkinsBuildNumber(project, buildNumber);
                
                if (!activeDeployments.isEmpty()) {
                    DeploymentHistory deployment = activeDeployments.get(0);
                    
                    System.out.println("🎯 Found matching deployment: " + deployment.getId());
                    System.out.println("   Project: " + deployment.getProject().getName());
                    System.out.println("   Environment: " + deployment.getEnvironment().getName());
                    System.out.println("   Version: " + deployment.getVersion());
                    
                    // Update deployment status immediately
                    deploymentService.updateDeploymentStatusFromJenkins(deployment.getId());
                    
                    response.put("success", true);
                    response.put("message", "Deployment status updated successfully");
                    response.put("deploymentId", deployment.getId());
                    
                    return ResponseEntity.ok(response);
                } else {
                    System.out.println("⚠️ No active deployment found for build #" + buildNumber);
                }
            } else {
                System.out.println("⚠️ Project not found for job: " + jobName);
            }
            
            response.put("success", false);
            response.put("message", "No matching deployment found");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("❌ Error processing Jenkins webhook: " + e.getMessage());
            e.printStackTrace();
            
            response.put("success", false);
            response.put("message", "Error processing webhook: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}
