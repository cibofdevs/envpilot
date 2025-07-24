package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.model.*;
import com.cibofdevs.envpilot.repository.ProjectRepository;
import com.cibofdevs.envpilot.repository.EnvironmentRepository;
import com.cibofdevs.envpilot.repository.DeploymentHistoryRepository;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.cibofdevs.envpilot.repository.FeatureFlagRepository;
import com.cibofdevs.envpilot.repository.ConfigurationRepository;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import com.cibofdevs.envpilot.service.SystemMonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/analytics")
@Tag(name = "Analytics", description = "Analytics and reporting APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class AnalyticsController {
    
    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private EnvironmentRepository environmentRepository;
    
    @Autowired
    private DeploymentHistoryRepository deploymentHistoryRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private FeatureFlagRepository featureFlagRepository;
    
    @Autowired
    private ConfigurationRepository configurationRepository;

    @Autowired
    private FeatureFlagService featureFlagService;

    @Autowired
    private SystemMonitoringService systemMonitoringService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/overview")
    @Operation(
        summary = "Get Analytics Overview",
        description = "Retrieve comprehensive analytics overview with basic metrics and growth data."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Analytics overview retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @io.swagger.v3.oas.annotations.media.ExampleObject(
                        name = "Analytics Overview",
                        value = "{\"totalProjects\": 5, \"totalEnvironments\": 15, \"totalDeployments\": 25, \"totalUsers\": 10, \"newProjectsLast30Days\": 2, \"newDeploymentsLast30Days\": 8}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Analytics feature disabled or access denied"
        )
    })
    public ResponseEntity<Map<String, Object>> getAnalyticsOverview() {
        if (!featureFlagService.isAnalyticsEnabled()) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Analytics feature is disabled by administrator.");
            return ResponseEntity.status(403).body(response);
        }
        Map<String, Object> overview = new HashMap<>();
        
        // Growth metrics (last 30 days)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        
        // Basic metrics
        overview.put("totalProjects", projectRepository.count());
        overview.put("totalEnvironments", environmentRepository.count());
        overview.put("totalDeployments", deploymentHistoryRepository.count());
        overview.put("totalUsers", userRepository.count());
        overview.put("totalFeatureFlags", featureFlagRepository.count());
        overview.put("totalConfigurations", configurationRepository.count());
        
        // Additional metrics for feature flags and configurations
        overview.put("enabledFeatureFlags", featureFlagRepository.countByEnabled(true));
        overview.put("recentConfigurations", configurationRepository.countByCreatedAtAfter(thirtyDaysAgo));
        
        // Growth metrics (last 30 days)
        overview.put("newProjectsLast30Days", projectRepository.countByCreatedAtAfter(thirtyDaysAgo));
        overview.put("newDeploymentsLast30Days", deploymentHistoryRepository.countByCreatedAtAfter(thirtyDaysAgo));
        
        return ResponseEntity.ok(overview);
    }

    @GetMapping("/projects/trends")
    public ResponseEntity<Map<String, Object>> getProjectTrends(
            @RequestParam(defaultValue = "30") int days) {
        if (!featureFlagService.isAnalyticsEnabled()) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Analytics feature is disabled by administrator.");
            return ResponseEntity.status(403).body(response);
        }
        
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        Map<String, Object> trends = new HashMap<>();
        
        // Projects created over time
        List<Project> recentProjects = projectRepository.findByCreatedAtAfter(startDate);
        Map<String, Long> projectsOverTime = recentProjects.stream()
            .collect(Collectors.groupingBy(
                project -> project.getCreatedAt().toLocalDate().toString(),
                Collectors.counting()
            ));
        trends.put("projectCreationTrends", projectsOverTime);
        
        // Project status distribution
        Map<String, Long> statusDistribution = new HashMap<>();
        for (Project.Status status : Project.Status.values()) {
            statusDistribution.put(status.name().toLowerCase(), 
                (long) projectRepository.findByStatus(status).size());
        }
        trends.put("projectStatusDistribution", statusDistribution);
        trends.put("totalProjects", projectRepository.count());
        
        // Deployment frequency over time
        List<DeploymentHistory> recentDeployments = deploymentHistoryRepository.findByCreatedAtAfter(startDate);
        Map<String, Long> deploymentsOverTime = recentDeployments.stream()
            .collect(Collectors.groupingBy(
                deployment -> deployment.getCreatedAt().toLocalDate().toString(),
                Collectors.counting()
            ));
        trends.put("deploymentFrequency", deploymentsOverTime);
        
        // Deployment status distribution
        Map<String, Long> deploymentStatusDistribution = recentDeployments.stream()
            .collect(Collectors.groupingBy(
                deployment -> deployment.getStatus().name().toLowerCase(),
                Collectors.counting()
            ));
        trends.put("deploymentStatusDistribution", deploymentStatusDistribution);
        trends.put("totalDeployments", (long) recentDeployments.size());
        
        // Most active projects (by deployment count)
        List<Object[]> activeProjects = deploymentHistoryRepository.findMostActiveProjects(10);
        List<Map<String, Object>> activeProjectsList = activeProjects.stream()
            .map(row -> {
                Map<String, Object> project = new HashMap<>();
                project.put("projectName", row[0]);
                project.put("deploymentCount", row[1]);
                return project;
            })
            .collect(Collectors.toList());
        trends.put("mostActiveProjects", activeProjectsList);
        
        return ResponseEntity.ok(trends);
    }

    @GetMapping("/deployments/analytics")
    public ResponseEntity<Map<String, Object>> getDeploymentAnalytics(
            @RequestParam(defaultValue = "30") int days) {
        if (!featureFlagService.isAnalyticsEnabled()) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Analytics feature is disabled by administrator.");
            return ResponseEntity.status(403).body(response);
        }
        
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        Map<String, Object> analytics = new HashMap<>();
        
        // Deployment frequency over time
        List<DeploymentHistory> recentDeployments = deploymentHistoryRepository.findByCreatedAtAfter(startDate);
        Map<String, Long> deploymentsOverTime = recentDeployments.stream()
            .collect(Collectors.groupingBy(
                deployment -> deployment.getCreatedAt().toLocalDate().toString(),
                Collectors.counting()
            ));
        analytics.put("deploymentsOverTime", deploymentsOverTime);
        
        // Deployment status distribution
        Map<String, Long> statusDistribution = recentDeployments.stream()
            .collect(Collectors.groupingBy(
                deployment -> deployment.getStatus().name().toLowerCase(),
                Collectors.counting()
            ));
        analytics.put("deploymentStatusDistribution", statusDistribution);
        
        // Deployments by environment
        Map<String, Long> deploymentsByEnvironment = recentDeployments.stream()
            .collect(Collectors.groupingBy(
                deployment -> deployment.getEnvironment().getName(),
                Collectors.counting()
            ));
        analytics.put("deploymentsByEnvironment", deploymentsByEnvironment);
        
        // Average deployment frequency
        long totalDeployments = recentDeployments.size();
        double avgDeploymentsPerDay = totalDeployments / (double) days;
        analytics.put("averageDeploymentsPerDay", Math.round(avgDeploymentsPerDay * 100.0) / 100.0);
        
        // Success rate
        long successfulDeployments = recentDeployments.stream()
            .filter(d -> d.getStatus() == DeploymentHistory.Status.SUCCESS)
            .count();
        double successRate = totalDeployments > 0 ? (successfulDeployments / (double) totalDeployments) * 100 : 0;
        analytics.put("deploymentSuccessRate", Math.round(successRate * 100.0) / 100.0);
        
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/environments/metrics")
    public ResponseEntity<Map<String, Object>> getEnvironmentMetrics() {
        if (!featureFlagService.isAnalyticsEnabled()) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Analytics feature is disabled by administrator.");
            return ResponseEntity.status(403).body(response);
        }
        Map<String, Object> metrics = new HashMap<>();
        
        // Get all environments
        List<Environment> allEnvironments = environmentRepository.findAll();
        long totalEnvironments = allEnvironments.size();
        
        // Get active environments (ONLINE status)
        List<Environment> activeEnvironments = environmentRepository.findByStatus(Environment.Status.ONLINE);
        long activeEnvironmentsCount = activeEnvironments.size();
        
        // Calculate active percentage
        double activePercentage = totalEnvironments > 0 ? 
            Math.round((activeEnvironmentsCount / (double) totalEnvironments) * 100.0) / 100.0 : 0;
        
        // Calculate average environments per project
        long totalProjects = projectRepository.count();
        double averageEnvironmentsPerProject = totalProjects > 0 ? 
            Math.round((totalEnvironments / (double) totalProjects) * 100.0) / 100.0 : 0;
        
        // Environment status distribution
        Map<String, Long> statusDistribution = new HashMap<>();
        for (Environment.Status status : Environment.Status.values()) {
            statusDistribution.put(status.name().toLowerCase(), 
                (long) environmentRepository.findByStatus(status).size());
        }
        
        // Environments by project (for chart)
        List<Object[]> envsByProject = environmentRepository.findEnvironmentCountByProject();
        Map<String, Long> environmentsPerProject = new HashMap<>();
        for (Object[] row : envsByProject) {
            String projectName = (String) row[0];
            Long count = (Long) row[1];
            environmentsPerProject.put(projectName, count);
        }
        
        // Environment health overview (based on recent deployments)
        Map<String, Object> environmentHealth = new HashMap<>();
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<DeploymentHistory> recentDeployments = deploymentHistoryRepository.findByCreatedAtAfter(thirtyDaysAgo);
        
        Map<String, List<DeploymentHistory>> deploymentsByEnv = recentDeployments.stream()
            .collect(Collectors.groupingBy(d -> d.getEnvironment().getName()));
        
        for (Map.Entry<String, List<DeploymentHistory>> entry : deploymentsByEnv.entrySet()) {
            String envName = entry.getKey();
            List<DeploymentHistory> envDeployments = entry.getValue();
            
            long successful = envDeployments.stream()
                .filter(d -> d.getStatus() == DeploymentHistory.Status.SUCCESS)
                .count();
            double successRate = !envDeployments.isEmpty() ?
                (successful / (double) envDeployments.size()) * 100 : 0;
            
            // Get last deployment date
            String lastDeployment = envDeployments.stream()
                .max(Comparator.comparing(DeploymentHistory::getCreatedAt))
                .map(d -> d.getCreatedAt().toString())
                .orElse(null);
            
            Map<String, Object> health = new HashMap<>();
            health.put("totalDeployments", envDeployments.size());
            health.put("successfulDeployments", successful);
            health.put("successRate", Math.round(successRate * 100.0) / 100.0);
            health.put("lastDeployment", lastDeployment);
            
            environmentHealth.put(envName, health);
        }
        
        // Build response
        metrics.put("totalEnvironments", totalEnvironments);
        metrics.put("activeEnvironments", activeEnvironmentsCount);
        metrics.put("activePercentage", activePercentage);
        metrics.put("averageEnvironmentsPerProject", averageEnvironmentsPerProject);
        metrics.put("statusDistribution", statusDistribution);
        metrics.put("environmentsPerProject", environmentsPerProject);
        metrics.put("environmentHealth", environmentHealth);
        metrics.put("totalFeatureFlags", featureFlagRepository.count());
        metrics.put("enabledFeatureFlags", featureFlagRepository.countByEnabled(true));
        
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/performance/metrics")
    public ResponseEntity<Map<String, Object>> getPerformanceMetrics(
            @RequestParam(defaultValue = "30") int days) {
        if (!featureFlagService.isAnalyticsEnabled()) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Analytics feature is disabled by administrator.");
            return ResponseEntity.status(403).body(response);
        }
        
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        Map<String, Object> metrics = new HashMap<>();
        
        List<DeploymentHistory> deployments = deploymentHistoryRepository.findByCreatedAtAfter(startDate);
        
        // Calculate average deployment time (using completedAt - createdAt)
        double averageDeploymentTime = 0.0;
        long completedDeployments = 0;
        long totalDeploymentTimeMinutes = 0;
        
        for (DeploymentHistory deployment : deployments) {
            if (deployment.getCompletedAt() != null && deployment.getCreatedAt() != null) {
                long durationMinutes = ChronoUnit.MINUTES.between(deployment.getCreatedAt(), deployment.getCompletedAt());
                totalDeploymentTimeMinutes += durationMinutes;
                completedDeployments++;
            }
        }
        
        if (completedDeployments > 0) {
            averageDeploymentTime = Math.round((totalDeploymentTimeMinutes / (double) completedDeployments) * 100.0) / 100.0;
        }
        metrics.put("averageDeploymentTime", averageDeploymentTime);
        
        // Calculate system uptime (based on successful deployments vs total deployments)
        long totalDeployments = deployments.size();
        long successfulDeployments = deployments.stream()
            .filter(d -> d.getStatus() == DeploymentHistory.Status.SUCCESS)
            .count();
        
        double systemUptime = totalDeployments > 0 ? 
            Math.round((successfulDeployments / (double) totalDeployments) * 100.0) / 100.0 : 99.5;
        metrics.put("systemUptime", systemUptime);
        
        // Calculate error rate
        long failedDeployments = deployments.stream()
            .filter(d -> d.getStatus() == DeploymentHistory.Status.FAILED)
            .count();
        
        double errorRate = totalDeployments > 0 ? 
            Math.round((failedDeployments / (double) totalDeployments) * 100.0) / 100.0 : 0.0;
        metrics.put("errorRate", errorRate);
        
        // Calculate average response time (based on actual database response time)
        try {
            long startTime = System.currentTimeMillis();
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            long endTime = System.currentTimeMillis();
            double averageResponseTime = endTime - startTime;
            metrics.put("averageResponseTime", Math.round(averageResponseTime * 100.0) / 100.0);
        } catch (Exception e) {
            metrics.put("averageResponseTime", 150.0); // Fallback value
        }
        
        // Deployment times by project
        Map<String, Double> deploymentTimesByProject = new HashMap<>();
        Map<String, List<DeploymentHistory>> deploymentsByProject = deployments.stream()
            .collect(Collectors.groupingBy(d -> d.getProject().getName()));
        
        for (Map.Entry<String, List<DeploymentHistory>> entry : deploymentsByProject.entrySet()) {
            String projectName = entry.getKey();
            List<DeploymentHistory> projectDeployments = entry.getValue();
            
            long projectTotalTime = 0;
            long projectCompletedCount = 0;
            
            for (DeploymentHistory deployment : projectDeployments) {
                if (deployment.getCompletedAt() != null && deployment.getCreatedAt() != null) {
                    long durationMinutes = ChronoUnit.MINUTES.between(deployment.getCreatedAt(), deployment.getCompletedAt());
                    projectTotalTime += durationMinutes;
                    projectCompletedCount++;
                }
            }
            
            if (projectCompletedCount > 0) {
                double avgTime = projectTotalTime / (double) projectCompletedCount;
                deploymentTimesByProject.put(projectName, Math.round(avgTime * 100.0) / 100.0);
            }
        }
        metrics.put("deploymentTimesByProject", deploymentTimesByProject);
        
        // Response times by environment (based on actual deployment data)
        Map<String, Double> responseTimesByEnvironment = new HashMap<>();
        Map<String, List<DeploymentHistory>> deploymentsByEnv = deployments.stream()
            .collect(Collectors.groupingBy(d -> d.getEnvironment().getName()));
        
        for (String envName : deploymentsByEnv.keySet()) {
            List<DeploymentHistory> envDeployments = deploymentsByEnv.get(envName);
            
            // Calculate average deployment time for this environment
            long totalTime = 0;
            long completedCount = 0;
            
            for (DeploymentHistory deployment : envDeployments) {
                if (deployment.getCompletedAt() != null && deployment.getCreatedAt() != null) {
                    long durationMinutes = ChronoUnit.MINUTES.between(deployment.getCreatedAt(), deployment.getCompletedAt());
                    totalTime += durationMinutes;
                    completedCount++;
                }
            }
            
            if (completedCount > 0) {
                double avgTime = totalTime / (double) completedCount;
                responseTimesByEnvironment.put(envName, Math.round(avgTime * 100.0) / 100.0);
            } else {
                // Fallback to base time if no completed deployments
                double baseTime = switch (envName.toLowerCase()) {
                    case "development" -> 5.0;
                    case "staging" -> 10.0;
                    case "production" -> 15.0;
                    default -> 8.0;
                };
                responseTimesByEnvironment.put(envName, baseTime);
            }
        }
        metrics.put("responseTimesByEnvironment", responseTimesByEnvironment);
        
        // System health overview (real data)
        Map<String, Object> systemHealth = systemMonitoringService.getSystemHealth();
        metrics.put("systemHealth", systemHealth);
        
        // Deployment success rate trend
        Map<String, Double> successRateTrend = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        
        // Calculate success rates for different periods
        for (int i = 0; i < 4; i++) {
            LocalDateTime periodStart = now.minusDays((i + 1) * 7);
            LocalDateTime periodEnd = now.minusDays(i * 7);
            
            List<DeploymentHistory> periodDeployments = deployments.stream()
                .filter(d -> d.getCreatedAt().isAfter(periodStart) && d.getCreatedAt().isBefore(periodEnd))
                .toList();
            
            if (!periodDeployments.isEmpty()) {
                long periodSuccessful = periodDeployments.stream()
                    .filter(d -> d.getStatus() == DeploymentHistory.Status.SUCCESS)
                    .count();
                double periodSuccessRate = (periodSuccessful / (double) periodDeployments.size()) * 100;
                successRateTrend.put("Week " + (i + 1), Math.round(periodSuccessRate * 100.0) / 100.0);
            } else {
                // If no deployments in this period, use overall success rate or 95% as default
                double defaultRate = totalDeployments > 0 ? 
                    (successfulDeployments / (double) totalDeployments) * 100 : 95.0;
                successRateTrend.put("Week " + (i + 1), Math.round(defaultRate * 100.0) / 100.0);
            }
        }
        metrics.put("successRateTrend", successRateTrend);
        
        // Resource usage (real data)
        Map<String, Object> resourceUsage = systemMonitoringService.getResourceUsage();
        metrics.put("resourceUsage", resourceUsage);
        
        // Recent performance issues (real data)
        List<Map<String, Object>> recentIssues = systemMonitoringService.getSystemIssues();
        metrics.put("recentIssues", recentIssues);
        
        // Peak deployment hours
        Map<Integer, Long> deploymentsByHour = deployments.stream()
            .collect(Collectors.groupingBy(
                d -> d.getCreatedAt().getHour(),
                Collectors.counting()
            ));
        metrics.put("deploymentsByHour", deploymentsByHour);
        
        // Peak deployment days of week
        Map<String, Long> deploymentsByDayOfWeek = deployments.stream()
            .collect(Collectors.groupingBy(
                d -> d.getCreatedAt().getDayOfWeek().toString(),
                Collectors.counting()
            ));
        metrics.put("deploymentsByDayOfWeek", deploymentsByDayOfWeek);
        
        // Environment health (based on recent deployment success)
        Map<String, Object> environmentHealth = new HashMap<>();
        Map<String, List<DeploymentHistory>> deploymentsByEnvForHealth = deployments.stream()
            .collect(Collectors.groupingBy(d -> d.getEnvironment().getName()));
        
        for (Map.Entry<String, List<DeploymentHistory>> entry : deploymentsByEnvForHealth.entrySet()) {
            String envName = entry.getKey();
            List<DeploymentHistory> envDeployments = entry.getValue();
            
            long successful = envDeployments.stream()
                .filter(d -> d.getStatus() == DeploymentHistory.Status.SUCCESS)
                .count();
            double successRate = !envDeployments.isEmpty() ?
                (successful / (double) envDeployments.size()) * 100 : 0;
            
            Map<String, Object> health = new HashMap<>();
            health.put("totalDeployments", envDeployments.size());
            health.put("successfulDeployments", successful);
            health.put("successRate", Math.round(successRate * 100.0) / 100.0);
            
            environmentHealth.put(envName, health);
        }
        metrics.put("environmentHealth", environmentHealth);
        
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/export")
    public ResponseEntity<Map<String, Object>> exportAnalyticsData(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        if (startDate == null) {
            startDate = LocalDateTime.now().minusDays(90);
        }
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }
        
        Map<String, Object> exportData = new HashMap<>();
        exportData.put("exportDate", LocalDateTime.now());
        exportData.put("dateRange", Map.of("start", startDate, "end", endDate));
        
        // Export all relevant data
        exportData.put("projects", projectRepository.findByCreatedAtBetween(startDate, endDate));
        exportData.put("deployments", deploymentHistoryRepository.findByCreatedAtBetween(startDate, endDate));
        exportData.put("environments", environmentRepository.findAll());
        exportData.put("users", userRepository.findByCreatedAtBetween(startDate, endDate));
        
        return ResponseEntity.ok(exportData);
    }

    // Frontend-expected endpoints
    @GetMapping("/trends")
    public ResponseEntity<Map<String, Object>> getTrends(
            @RequestParam(defaultValue = "30") int days) {
        return getProjectTrends(days);
    }

    @GetMapping("/deployments")
    public ResponseEntity<Map<String, Object>> getDeployments(
            @RequestParam(defaultValue = "30") int days) {
        return getDeploymentAnalytics(days);
    }

    @GetMapping("/environments")
    public ResponseEntity<Map<String, Object>> getEnvironments() {
        return getEnvironmentMetrics();
    }

    @GetMapping("/performance")
    public ResponseEntity<Map<String, Object>> getPerformance(
            @RequestParam(defaultValue = "30") int days) {
        return getPerformanceMetrics(days);
    }
}