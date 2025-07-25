package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.dto.DeploymentRequest;
import com.cibofdevs.envpilot.model.*;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.cibofdevs.envpilot.repository.NotificationRepository;
import com.cibofdevs.envpilot.service.DeploymentService;
import com.cibofdevs.envpilot.service.EnvironmentService;
import com.cibofdevs.envpilot.service.ProjectService;
import com.cibofdevs.envpilot.service.UserDetailsServiceImpl;
import com.cibofdevs.envpilot.service.JenkinsService;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import com.cibofdevs.envpilot.service.NotificationService;
import com.cibofdevs.envpilot.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/projects")
@Tag(name = "Projects", description = "Project management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class ProjectController {
    @Autowired
    private ProjectService projectService;

    @Autowired
    private EnvironmentService environmentService;

    @Autowired
    private DeploymentService deploymentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JenkinsService jenkinsService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private FeatureFlagService featureFlagService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private EmailService emailService;

    @GetMapping
    @Operation(
        summary = "Get All Projects",
        description = "Retrieve all projects from the system. For non-admin users, only returns projects they are assigned to."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Projects retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Project.class)
            )
        )
    })
    public ResponseEntity<List<Project>> getAllProjects(Authentication authentication) {
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Admin can see all projects
        if (userRole == User.Role.ADMIN) {
            return ResponseEntity.ok(projectService.getAllProjects());
        }
        
        // Non-admin users only see projects they are assigned to
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(projectService.getProjectsByUserId(userId));
    }

    @GetMapping("/{id}")
    @Operation(
        summary = "Get Project by ID",
        description = "Retrieve a specific project by its ID. Non-admin users can only access projects they are assigned to."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Project found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Project.class)
            )
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - project not assigned to user"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Project not found"
        )
    })
    public ResponseEntity<Project> getProjectById(@PathVariable Long id, Authentication authentication) {
        Optional<Project> project = projectService.getProjectById(id);
        if (project.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Admin can access all projects
        if (userRole == User.Role.ADMIN) {
            return ResponseEntity.ok(project.get());
        }
        
        // Non-admin users can only access projects they are assigned to
        Long userId = userPrincipal.getId();
        boolean hasAccess = projectService.hasUserAccessToProject(userId, id);
        
        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }
        
        return ResponseEntity.ok(project.get());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Project>> searchProjects(@RequestParam String keyword, Authentication authentication) {
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Admin can search all projects
        if (userRole == User.Role.ADMIN) {
            return ResponseEntity.ok(projectService.searchProjects(keyword));
        }
        
        // Non-admin users can only search projects they are assigned to
        Long userId = userPrincipal.getId();
        return ResponseEntity.ok(projectService.searchProjectsByUserId(keyword, userId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Create Project",
        description = "Create a new project. Requires ADMIN role.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Project data",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Project.class),
                examples = {
                    @ExampleObject(
                        name = "New Project",
                        value = "{\"name\": \"My Project\", \"description\": \"A sample project\", \"status\": \"ACTIVE\"}"
                    )
                }
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Project created successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Project.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid project data"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - insufficient permissions"
        )
    })
    public ResponseEntity<Project> createProject(@Valid @RequestBody Project project, Authentication authentication) {
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User owner = userRepository.findByEmail(userPrincipal.getUsername()).orElse(null);
        
        if (owner == null) {
            return ResponseEntity.badRequest().build();
        }
        
        project.setOwner(owner);
        Project savedProject = projectService.createProject(project);
        
        // Create default environments
        createDefaultEnvironments(savedProject);
        
        // Audit logging for project creation
        if (featureFlagService.isAuditLoggingEnabled()) {
            System.out.println("📋 AUDIT LOG: Project created");
            System.out.println("   Creator: " + owner.getName() + " (" + owner.getEmail() + ")");
            System.out.println("   Project: " + savedProject.getName());
            System.out.println("   Description: " + savedProject.getDescription());
            System.out.println("   Status: " + savedProject.getStatus().name());
            System.out.println("   Timestamp: " + LocalDateTime.now());
        }
        
        return ResponseEntity.ok(savedProject);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Project> updateProject(@PathVariable Long id, @Valid @RequestBody Project projectDetails, Authentication authentication) {
        Optional<Project> projectOpt = projectService.getProjectById(id);
        if (projectOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();

        Project project = projectOpt.get();
        String oldName = project.getName();
        project.setName(projectDetails.getName());
        project.setDescription(projectDetails.getDescription());
        project.setStatus(projectDetails.getStatus());

        Project updatedProject = projectService.updateProject(project);
        
        // Create notification for project update
        User currentUser = userRepository.findByEmail(userPrincipal.getUsername()).orElse(null);
        
        if (currentUser != null) {
            String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            Notification notification = new Notification();
            notification.setTitle("Project Updated");
            notification.setDescription("Project '" + oldName + "' has been updated to '" + updatedProject.getName() + "' by " + currentUser.getName());
            notification.setType("info");
            notification.setTime(currentTime);
            notification.setUser(currentUser);
            notificationRepository.save(notification);
            
            // Audit logging for project update
            if (featureFlagService.isAuditLoggingEnabled()) {
                System.out.println("📋 AUDIT LOG: Project updated");
                System.out.println("   Updater: " + currentUser.getName() + " (" + currentUser.getEmail() + ")");
                System.out.println("   Old Name: " + oldName);
                System.out.println("   New Name: " + updatedProject.getName());
                System.out.println("   Description: " + updatedProject.getDescription());
                System.out.println("   Status: " + updatedProject.getStatus().name());
                System.out.println("   Timestamp: " + LocalDateTime.now());
            }
        }

        return ResponseEntity.ok(updatedProject);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteProject(@PathVariable Long id, Authentication authentication) {
        if (!projectService.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        // Get project details before deletion for notification
        Optional<Project> projectOpt = projectService.getProjectById(id);
        String projectName = projectOpt.map(Project::getName).orElse("Unknown Project");
        
        projectService.deleteProject(id);
        
        // Create notification for project deletion
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User currentUser = userRepository.findByEmail(userPrincipal.getUsername()).orElse(null);
        
        if (currentUser != null) {
            String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            Notification notification = new Notification();
            notification.setTitle("Project Deleted");
            notification.setDescription("Project '" + projectName + "' has been deleted by " + currentUser.getName());
            notification.setType("warning");
            notification.setTime(currentTime);
            notification.setUser(currentUser);
            notificationRepository.save(notification);
            
            // Audit logging for project deletion
            if (featureFlagService.isAuditLoggingEnabled()) {
                System.out.println("📋 AUDIT LOG: Project deleted");
                System.out.println("   Deleter: " + currentUser.getName() + " (" + currentUser.getEmail() + ")");
                System.out.println("   Project: " + projectName);
                System.out.println("   Timestamp: " + LocalDateTime.now());
            }
        }
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Project deleted successfully!");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/environments")
    public ResponseEntity<List<Environment>> getProjectEnvironments(@PathVariable Long id, Authentication authentication) {
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Admin can access all project environments
        if (userRole == User.Role.ADMIN) {
            return ResponseEntity.ok(environmentService.getEnvironmentsByProjectId(id));
        }
        
        // Non-admin users can only access environments from projects they are assigned to
        Long userId = userPrincipal.getId();
        boolean hasAccess = projectService.hasUserAccessToProject(userId, id);
        
        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }
        
        return ResponseEntity.ok(environmentService.getEnvironmentsByProjectId(id));
    }

    @PostMapping("/{id}/deploy")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DEVELOPER') or hasRole('QA')")
    public ResponseEntity<Map<String, Object>> deployProject(@PathVariable Long id, 
                                                          @RequestParam Long environmentId,
                                                          @Valid @RequestBody DeploymentRequest deploymentRequest,
                                                          Authentication authentication) {
        Optional<Project> projectOpt = projectService.getProjectById(id);
        Optional<Environment> environmentOpt = environmentService.getEnvironmentById(environmentId);
        Map<String, Object> response = new HashMap<>();
        if (projectOpt.isEmpty() || environmentOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Project atau environment tidak ditemukan");
            return ResponseEntity.status(404).body(response);
        }

        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User triggeredBy = userRepository.findByEmail(userPrincipal.getUsername()).orElse(null);
        if (triggeredBy == null) {
            response.put("success", false);
            response.put("message", "User tidak valid");
            return ResponseEntity.badRequest().body(response);
        }

        // Validasi akses deployment berdasarkan role dan environment
        String environmentName = environmentOpt.get().getName().toLowerCase();
        User.Role userRole = triggeredBy.getRole();
        
        // Hanya ADMIN yang bisa deploy ke staging dan production
        if ((environmentName.equals("staging") || environmentName.equals("production")) && 
            userRole != User.Role.ADMIN) {
            response.put("success", false);
            response.put("message", "Akses ditolak. Hanya Admin yang dapat deploy ke environment " + environmentName);
            return ResponseEntity.status(403).body(response);
        }

        // Non-admin users can only deploy projects they are assigned to
        if (userRole != User.Role.ADMIN) {
            boolean hasAccess = projectService.hasUserAccessToProject(triggeredBy.getId(), id);
            if (!hasAccess) {
                response.put("success", false);
                response.put("message", "Akses ditolak. Anda tidak di-assign ke project ini");
                return ResponseEntity.status(403).body(response);
            }
        }

        DeploymentHistory deployment = deploymentService.createDeployment(
                deploymentRequest.getVersion(),
                deploymentRequest.getNotes(),
                projectOpt.get(),
                environmentOpt.get(),
                triggeredBy
        );

        String envNameToSend = deploymentRequest.getEnvName() != null && !deploymentRequest.getEnvName().isEmpty()
            ? deploymentRequest.getEnvName()
            : environmentOpt.get().getName();
        // Trigger Jenkins setelah mencatat deployment history
        boolean jenkinsSuccess = true;
        String jenkinsMsg = "Deployment triggered";
        Integer buildNumber = null;
        try {
            System.out.println("🚀 ProjectController: Triggering Jenkins job for project: " + projectOpt.get().getName());
            System.out.println("   Project ID: " + projectOpt.get().getId());
            System.out.println("   Environment: " + environmentOpt.get().getName());
            System.out.println("   Version: " + deploymentRequest.getVersion());
            
            Map<String, Object> jenkinsResult = jenkinsService.triggerJenkinsJob(
                projectOpt.get(),
                environmentOpt.get(),
                deploymentRequest.getVersion(),
                deploymentRequest.getNotes(),
                envNameToSend,
                triggeredBy
            );
            
            System.out.println("📋 ProjectController: Jenkins result received:");
            System.out.println("   Success: " + jenkinsResult.get("success"));
            System.out.println("   Build Number: " + jenkinsResult.get("buildNumber"));
            System.out.println("   Build URL: " + jenkinsResult.get("buildUrl"));
            System.out.println("   Build Location: " + jenkinsResult.get("buildLocation"));
            System.out.println("   Full Jenkins Result: " + jenkinsResult);
            
            if ((Boolean) jenkinsResult.get("success")) {
                // Try to get build number from Jenkins response
                if (jenkinsResult.containsKey("buildNumber")) {
                    buildNumber = (Integer) jenkinsResult.get("buildNumber");
                    System.out.println("✅ ProjectController: Using build number from Jenkins result: " + buildNumber);
                } else {
                    System.out.println("⚠️ ProjectController: No build number in Jenkins result");
                }
            
            // Update deployment with Jenkins build info if available
            if (buildNumber != null) {
                String buildUrl = (String) jenkinsResult.get("buildUrl");
                deploymentService.updateJenkinsBuildInfo(deployment.getId(), buildNumber, buildUrl);
            }
            
            // Create bell notification for deployment triggered
            try {
                String projectName = projectOpt.get().getName();
                String envName = environmentOpt.get().getName();
                String deployVersion = deploymentRequest.getVersion() != null ? deploymentRequest.getVersion() : "latest";
                String buildNumberText = buildNumber != null ? " (Build #" + buildNumber + ")" : "";
                
                notificationService.createNotification(
                    triggeredBy,
                    "🚀 Deployment Triggered",
                    String.format("Deployment of project '%s' to %s with version %s%s has been successfully triggered in Jenkins", 
                        projectName, envName, deployVersion, buildNumberText),
                    "info"
                );
                
                                        System.out.println("🔔 Bell notification created for deployment trigger");
                        System.out.println("   User: " + triggeredBy.getName());
                        System.out.println("   Project: " + projectName);
                        System.out.println("   Environment: " + envName);
                        System.out.println("   Version: " + deployVersion);
                        System.out.println("   Build Number: " + buildNumber);
                        
                        // Note: Email notifications will be sent when deployment is completed
                        // (SUCCESS/FAILED) in DeploymentService.updateDeploymentStatusFromJenkins()
                        System.out.println("📧 Email notifications will be sent when deployment completes");
                        
                    } catch (Exception e) {
                        System.err.println("❌ Failed to create deployment trigger notification: " + e.getMessage());
                        // Don't crash the application if notification creation fails
                    }
            
        } else {
            jenkinsSuccess = false;
            jenkinsMsg = "Deployment tercatat, tapi gagal trigger Jenkins: " + jenkinsResult.get("message");
            System.err.println("Gagal trigger Jenkins: " + jenkinsResult.get("message"));
        }
        } catch (Exception e) {
            jenkinsSuccess = false;
            jenkinsMsg = "Deployment tercatat, tapi gagal trigger Jenkins: " + e.getMessage();
            System.err.println("Gagal trigger Jenkins: " + e.getMessage());
        }

        response.put("success", jenkinsSuccess);
        response.put("message", jenkinsMsg);
        response.put("deployment", deployment);
        if (buildNumber != null) {
            response.put("buildNumber", buildNumber);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/deployments")
    public ResponseEntity<List<DeploymentHistory>> getProjectDeployments(@PathVariable Long id, Authentication authentication) {
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        // Admin can access all project deployments
        if (userRole == User.Role.ADMIN) {
            return ResponseEntity.ok(deploymentService.getDeploymentsByProjectId(id));
        }
        
        // Non-admin users can only access deployments from projects they are assigned to
        Long userId = userPrincipal.getId();
        boolean hasAccess = projectService.hasUserAccessToProject(userId, id);
        
        if (!hasAccess) {
            return ResponseEntity.status(403).build();
        }
        
        return ResponseEntity.ok(deploymentService.getDeploymentsByProjectId(id));
    }

    private void createDefaultEnvironments(Project project) {
        String[] envNames = {"development", "staging", "production"};
        for (String envName : envNames) {
            Environment env = new Environment();
            env.setName(envName);
            env.setProject(project);
            environmentService.createEnvironment(env);
        }
    }
}
