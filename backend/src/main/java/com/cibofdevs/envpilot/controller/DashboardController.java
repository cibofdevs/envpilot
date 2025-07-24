package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.model.Project;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.DeploymentHistoryRepository;
import com.cibofdevs.envpilot.repository.EnvironmentRepository;
import com.cibofdevs.envpilot.repository.EnvironmentAssignmentRepository;
import com.cibofdevs.envpilot.repository.ProjectRepository;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.cibofdevs.envpilot.service.JenkinsService;
import com.cibofdevs.envpilot.service.DeploymentService;
import com.cibofdevs.envpilot.model.EnvironmentAssignment;
import com.cibofdevs.envpilot.service.UserDetailsServiceImpl;
import org.springframework.security.core.Authentication;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import com.cibofdevs.envpilot.model.DeploymentHistory;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Dashboard statistics and data APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class DashboardController {
    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private EnvironmentRepository environmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DeploymentHistoryRepository deploymentHistoryRepository;

    @Autowired
    private JenkinsService jenkinsService;
    
    @Autowired
    private DeploymentService deploymentService;
    
    @Autowired
    private EnvironmentAssignmentRepository environmentAssignmentRepository;

    @GetMapping("/stats")
    @Operation(
        summary = "Get Dashboard Statistics",
        description = "Retrieve comprehensive statistics for the dashboard including counts and breakdowns."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Dashboard statistics retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @io.swagger.v3.oas.annotations.media.ExampleObject(
                        name = "Dashboard Stats",
                        value = "{\"totalProjects\": 5, \"totalEnvironments\": 15, \"totalUsers\": 10, \"totalDeployments\": 25, \"projectsByStatus\": {\"active\": 3, \"inactive\": 1, \"archived\": 1}, \"environmentsByStatus\": {\"online\": 12, \"offline\": 3}, \"usersByRole\": {\"admin\": 2, \"developer\": 6, \"qa\": 2}}"
                    )
                }
            )
        )
    })
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Basic counts
        stats.put("totalProjects", projectRepository.count());
        stats.put("totalEnvironments", environmentRepository.count());
        stats.put("totalUsers", userRepository.count());
        stats.put("totalDeployments", deploymentHistoryRepository.count());
        
        // Project status breakdown
        Map<String, Long> projectsByStatus = new HashMap<>();
        for (Project.Status status : Project.Status.values()) {
            projectsByStatus.put(status.name().toLowerCase(), 
                (long) projectRepository.findByStatus(status).size());
        }
        stats.put("projectsByStatus", projectsByStatus);
        
        // Environment status breakdown
        Map<String, Long> environmentsByStatus = new HashMap<>();
        for (Environment.Status status : Environment.Status.values()) {
            environmentsByStatus.put(status.name().toLowerCase(), 
                (long) environmentRepository.findByStatus(status).size());
        }
        stats.put("environmentsByStatus", environmentsByStatus);
        
        // User role breakdown
        Map<String, Long> usersByRole = new HashMap<>();
        List<User> allUsers = userRepository.findAll();
        for (User.Role role : User.Role.values()) {
            long count = allUsers.stream()
                .filter(user -> user.getRole() == role)
                .count();
            usersByRole.put(role.name().toLowerCase(), count);
        }
        stats.put("usersByRole", usersByRole);
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/recent-projects")
    public ResponseEntity<List<Project>> getRecentProjects(
            @RequestParam(defaultValue = "5") int limit,
            Authentication authentication) {
        
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        List<Project> projects;
        
        // Admin can see all projects
        if (userRole == User.Role.ADMIN) {
            projects = projectRepository.findAll();
        } else {
            // Non-admin users only see projects they are assigned to
            Long userId = userPrincipal.getId();
            projects = projectRepository.findProjectsByUserId(userId);
        }
        
        return ResponseEntity.ok(projects.stream()
            .sorted((p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt()))
            .limit(limit)
            .toList());
    }

    @GetMapping("/active-environments")
    public ResponseEntity<List<Environment>> getActiveEnvironments(
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        User.Role userRole = userPrincipal.getAuthorities().stream()
            .map(authority -> {
                String roleName = authority.getAuthority().replace("ROLE_", "");
                return User.Role.valueOf(roleName);
            })
            .findFirst()
            .orElse(User.Role.DEVELOPER);
        
        List<Environment> environments;
        
        // Admin can see all active environments
        if (userRole == User.Role.ADMIN) {
            environments = environmentRepository.findByStatus(Environment.Status.ONLINE);
        } else {
            // Non-admin users only see environments they are assigned to
            Long userId = userPrincipal.getId();
            
            // Debug logging
            System.out.println("=== Active Environments Debug ===");
            System.out.println("User ID: " + userId);
            System.out.println("User Role: " + userRole);
            
            // Try the original query first
            environments = environmentRepository.findActiveEnvironmentsByUserId(userId);
            
            // If no results, try without status filter for debugging
            if (environments.isEmpty()) {
                System.out.println("No environments found with ONLINE status, trying without status filter...");
                environments = environmentRepository.findEnvironmentsByUserId(userId);
                System.out.println("Found environments without status filter: " + environments.size());
            }
            
            System.out.println("Found environments: " + environments.size());
            for (Environment env : environments) {
                System.out.println("  - " + env.getName() + " (ID: " + env.getId() + ", Status: " + env.getStatus() + ")");
            }
            
            // Also check all environments for this user regardless of status
            System.out.println("=== All Environments for User ===");
            List<Environment> allUserEnvironments = environmentRepository.findAll().stream()
                .filter(env -> env.getAssignments() != null && 
                              env.getAssignments().stream()
                                  .anyMatch(assignment -> assignment.getUser().getId().equals(userId) && 
                                                         assignment.getStatus() == EnvironmentAssignment.Status.ACTIVE))
                .toList();
            System.out.println("All user environments: " + allUserEnvironments.size());
            for (Environment env : allUserEnvironments) {
                System.out.println("  - " + env.getName() + " (ID: " + env.getId() + ", Status: " + env.getStatus() + ")");
            }
            
            // Check all assignments for this user
            System.out.println("=== All Assignments for User ===");
            List<EnvironmentAssignment> userAssignments = environmentAssignmentRepository.findByUserId(userId);
            System.out.println("All user assignments: " + userAssignments.size());
            for (EnvironmentAssignment assignment : userAssignments) {
                System.out.println("  - Environment: " + assignment.getEnvironment().getName() + 
                                 " (ID: " + assignment.getEnvironment().getId() + 
                                 ", Status: " + assignment.getEnvironment().getStatus() + 
                                 "), Assignment Status: " + assignment.getStatus());
            }
        }
        
        return ResponseEntity.ok(environments.stream()
            .limit(limit)
            .toList());
    }

    @GetMapping("/recent-builds")
    @Operation(
        summary = "Get Recent Builds from All Jenkins Projects",
        description = "Retrieve recent builds from all projects that have Jenkins configuration. This endpoint aggregates builds from multiple projects for dashboard display."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Recent builds retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class)
            )
        )
    })
    public ResponseEntity<Map<String, Object>> getRecentBuilds(
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> allBuilds = new ArrayList<>();
        List<Project> jenkinsProjects = new ArrayList<>();

        try {
            // Get user role and filter projects based on assignment
            UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
            User.Role userRole = userPrincipal.getAuthorities().stream()
                .map(authority -> {
                    String roleName = authority.getAuthority().replace("ROLE_", "");
                    return User.Role.valueOf(roleName);
                })
                .findFirst()
                .orElse(User.Role.DEVELOPER);
            
            List<Project> allProjects;
            
            // Admin can see all projects
            if (userRole == User.Role.ADMIN) {
                allProjects = projectRepository.findAll();
            } else {
                // Non-admin users only see projects they are assigned to
                Long userId = userPrincipal.getId();
                allProjects = projectRepository.findProjectsByUserId(userId);
            }
            
            // Filter projects with Jenkins configuration
            List<Project> configuredProjects = allProjects.stream()
                .filter(project -> project.getJenkinsUrl() != null && 
                                 !project.getJenkinsUrl().trim().isEmpty() &&
                                 project.getJenkinsJobName() != null && 
                                 !project.getJenkinsJobName().trim().isEmpty() &&
                                 project.getJenkinsUsername() != null && 
                                 !project.getJenkinsUsername().trim().isEmpty() &&
                                 project.getJenkinsToken() != null && 
                                 !project.getJenkinsToken().trim().isEmpty())
                .toList();

            jenkinsProjects = configuredProjects;

            // Get recent builds from each configured project
            for (Project project : configuredProjects) {
                try {
                    Map<String, Object> projectBuilds = jenkinsService.getRecentBuilds(project, limit);
                    if ((Boolean) projectBuilds.get("success") && projectBuilds.get("builds") != null) {
                        List<Map<String, Object>> builds = (List<Map<String, Object>>) projectBuilds.get("builds");
                        for (Map<String, Object> build : builds) {
                            // For now, show all builds for projects the user has access to
                            // This ensures builds are not lost due to missing user information
                            // TODO: Implement proper user filtering when Jenkins properly stores triggeredByUserId
                            
                            // Add project information to each build
                            build.put("projectId", project.getId());
                            build.put("projectName", project.getName());
                            build.put("projectJenkinsUrl", project.getJenkinsUrl());
                            build.put("projectJenkinsJobName", project.getJenkinsJobName());
                            allBuilds.add(build);
                        }
                    }
                } catch (Exception e) {
                    // Log error but continue with other projects
                    System.err.println("Error fetching builds for project " + project.getName() + ": " + e.getMessage());
                }
            }

            // Sort builds by timestamp (most recent first) and limit
            allBuilds.sort((b1, b2) -> {
                Long timestamp1 = (Long) b1.get("timestamp");
                Long timestamp2 = (Long) b2.get("timestamp");
                if (timestamp1 == null) timestamp1 = 0L;
                if (timestamp2 == null) timestamp2 = 0L;
                return timestamp2.compareTo(timestamp1);
            });

            // Limit the total number of builds
            if (allBuilds.size() > limit) {
                allBuilds = allBuilds.subList(0, limit);
            }

            result.put("success", true);
            result.put("builds", allBuilds);
            result.put("projects", jenkinsProjects);
            result.put("totalBuilds", allBuilds.size());
            result.put("totalProjects", jenkinsProjects.size());

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error fetching recent builds: " + e.getMessage());
            result.put("builds", new ArrayList<>());
            result.put("projects", new ArrayList<>());
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/recent-deployments")
    @Operation(
        summary = "Get Recent Deployments from Database",
        description = "Retrieve recent deployments from database for dashboard display. This endpoint shows deployments that were triggered by the current user or projects they have access to."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Recent deployments retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class)
            )
        )
    })
    public ResponseEntity<Map<String, Object>> getRecentDeployments(
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> allDeployments = new ArrayList<>();

        try {
            // Get user role and filter projects based on assignment
            UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
            User.Role userRole = userPrincipal.getAuthorities().stream()
                .map(authority -> {
                    String roleName = authority.getAuthority().replace("ROLE_", "");
                    return User.Role.valueOf(roleName);
                })
                .findFirst()
                .orElse(User.Role.DEVELOPER);
            
            List<DeploymentHistory> deployments;
            
            // Admin can see all deployments
            if (userRole == User.Role.ADMIN) {
                deployments = deploymentService.getAllDeployments();
            } else {
                // Non-admin users only see their own deployments
                Long userId = userPrincipal.getId();
                deployments = deploymentService.getDeploymentsByUser(userId);
            }
            
            // Sort by creation date (most recent first) and limit
            deployments.sort((d1, d2) -> d2.getCreatedAt().compareTo(d1.getCreatedAt()));
            if (deployments.size() > limit) {
                deployments = deployments.subList(0, limit);
            }
            
            // Convert to map format for frontend
            for (DeploymentHistory deployment : deployments) {
                Map<String, Object> deploymentMap = new HashMap<>();
                deploymentMap.put("id", deployment.getId());
                deploymentMap.put("projectId", deployment.getProject().getId());
                deploymentMap.put("projectName", deployment.getProject().getName());
                deploymentMap.put("environmentId", deployment.getEnvironment().getId());
                deploymentMap.put("environmentName", deployment.getEnvironment().getName());
                deploymentMap.put("version", deployment.getVersion());
                deploymentMap.put("status", deployment.getStatus().name());
                deploymentMap.put("notes", deployment.getNotes());
                deploymentMap.put("triggeredByUserId", deployment.getTriggeredBy().getId());
                deploymentMap.put("triggeredByUserName", deployment.getTriggeredBy().getName());
                deploymentMap.put("triggeredByUserEmail", deployment.getTriggeredBy().getEmail());
                deploymentMap.put("createdAt", deployment.getCreatedAt());
                deploymentMap.put("completedAt", deployment.getCompletedAt());
                deploymentMap.put("jenkinsBuildNumber", deployment.getJenkinsBuildNumber());
                deploymentMap.put("jenkinsBuildUrl", deployment.getJenkinsBuildUrl());
                
                allDeployments.add(deploymentMap);
            }

            result.put("success", true);
            result.put("deployments", allDeployments);
            result.put("totalDeployments", allDeployments.size());

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error fetching recent deployments: " + e.getMessage());
            result.put("deployments", new ArrayList<>());
        }

        return ResponseEntity.ok(result);
    }
}
