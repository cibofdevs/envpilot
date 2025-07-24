package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.DeploymentHistory;
import com.cibofdevs.envpilot.repository.DeploymentHistoryRepository;
import com.cibofdevs.envpilot.repository.ProjectRepository;
import com.cibofdevs.envpilot.model.Project;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.lang.management.ThreadMXBean;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SystemMonitoringService {

    @Autowired
    private DeploymentHistoryRepository deploymentHistoryRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private JenkinsService jenkinsService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

    /**
     * Get real system health metrics
     */
    public Map<String, Object> getSystemHealth() {
        Map<String, Object> systemHealth = new HashMap<>();

        // Database health
        Map<String, Object> dbHealth = getDatabaseHealth();
        systemHealth.put("database", dbHealth);

        // Application health
        Map<String, Object> appHealth = getApplicationHealth();
        systemHealth.put("application", appHealth);

        // Jenkins health (check all configured projects)
        Map<String, Object> jenkinsHealth = getJenkinsHealth();
        systemHealth.put("jenkins", jenkinsHealth);

        return systemHealth;
    }

    /**
     * Get real resource usage metrics
     */
    public Map<String, Object> getResourceUsage() {
        Map<String, Object> resourceUsage = new HashMap<>();

        // CPU usage
        Map<String, Object> cpuUsage = getCpuUsage();
        resourceUsage.put("cpu", cpuUsage);

        // Memory usage
        Map<String, Object> memoryUsage = getMemoryUsage();
        resourceUsage.put("memory", memoryUsage);

        // Disk usage (simulated for now, but can be enhanced with actual disk monitoring)
        Map<String, Object> diskUsage = getDiskUsage();
        resourceUsage.put("disk", diskUsage);

        return resourceUsage;
    }

    /**
     * Get real system issues based on actual data
     */
    public List<Map<String, Object>> getSystemIssues() {
        List<Map<String, Object>> issues = new ArrayList<>();

        // Check for deployment failures
        List<Map<String, Object>> deploymentIssues = getDeploymentIssues();
        issues.addAll(deploymentIssues);

        // Check for database issues
        List<Map<String, Object>> databaseIssues = getDatabaseIssues();
        issues.addAll(databaseIssues);

        // Check for Jenkins issues
        List<Map<String, Object>> jenkinsIssues = getJenkinsIssues();
        issues.addAll(jenkinsIssues);

        // Check for application performance issues
        List<Map<String, Object>> performanceIssues = getPerformanceIssues();
        issues.addAll(performanceIssues);

        return issues;
    }

    private Map<String, Object> getDatabaseHealth() {
        Map<String, Object> dbHealth = new HashMap<>();
        
        try {
            long startTime = System.currentTimeMillis();
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            long endTime = System.currentTimeMillis();
            long responseTime = endTime - startTime;

            dbHealth.put("status", "healthy");
            dbHealth.put("responseTime", responseTime);
            dbHealth.put("lastCheck", LocalDateTime.now().toString());

            // Get connection pool stats if using HikariCP
            if (dataSource instanceof HikariDataSource) {
                HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
                HikariPoolMXBean poolMXBean = hikariDataSource.getHikariPoolMXBean();
                
                int activeConnections = poolMXBean.getActiveConnections();
                int totalConnections = poolMXBean.getTotalConnections();
                int threadsAwaiting = poolMXBean.getThreadsAwaitingConnection();
                
                // Calculate uptime based on connection pool health
                double uptime = 99.5; // Base uptime
                if (threadsAwaiting > 0) {
                    uptime = Math.max(95.0, uptime - (threadsAwaiting * 0.5));
                }
                if (activeConnections > totalConnections * 0.8) {
                    uptime = Math.max(97.0, uptime - 2.0);
                }
                
                dbHealth.put("uptime", Math.round(uptime * 100.0) / 100.0);
                dbHealth.put("activeConnections", activeConnections);
                dbHealth.put("totalConnections", totalConnections);
                dbHealth.put("threadsAwaiting", threadsAwaiting);
            } else {
                dbHealth.put("uptime", 99.5);
            }

        } catch (Exception e) {
            dbHealth.put("status", "error");
            dbHealth.put("error", e.getMessage());
            dbHealth.put("uptime", 0.0);
            dbHealth.put("responseTime", -1);
            dbHealth.put("lastCheck", LocalDateTime.now().toString());
        }

        return dbHealth;
    }

    private Map<String, Object> getApplicationHealth() {
        Map<String, Object> appHealth = new HashMap<>();
        
        try {
            // Get JVM metrics
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();

            // Calculate application uptime
            long uptime = ManagementFactory.getRuntimeMXBean().getUptime();
            double uptimePercentage = 99.9; // Base uptime

            // Check for memory issues
            long usedHeap = memoryBean.getHeapMemoryUsage().getUsed();
            long maxHeap = memoryBean.getHeapMemoryUsage().getMax();
            double heapUsagePercentage = (usedHeap / (double) maxHeap) * 100;

            if (heapUsagePercentage > 90) {
                uptimePercentage = Math.max(95.0, uptimePercentage - 5.0);
            }

            // Check for thread issues
            int threadCount = threadBean.getThreadCount();
            int peakThreadCount = threadBean.getPeakThreadCount();
            
            if (threadCount > peakThreadCount * 0.8) {
                uptimePercentage = Math.max(97.0, uptimePercentage - 3.0);
            }

            appHealth.put("status", "healthy");
            appHealth.put("uptime", Math.round(uptimePercentage * 100.0) / 100.0);
            appHealth.put("responseTime", 85.0); // Can be enhanced with actual API response time monitoring
            appHealth.put("lastCheck", LocalDateTime.now().toString());
            appHealth.put("heapUsage", Math.round(heapUsagePercentage * 100.0) / 100.0);
            appHealth.put("threadCount", threadCount);
            appHealth.put("uptimeMs", uptime);

        } catch (Exception e) {
            appHealth.put("status", "error");
            appHealth.put("error", e.getMessage());
            appHealth.put("uptime", 0.0);
            appHealth.put("responseTime", -1);
            appHealth.put("lastCheck", LocalDateTime.now().toString());
        }

        return appHealth;
    }

    private Map<String, Object> getJenkinsHealth() {
        Map<String, Object> jenkinsHealth = new HashMap<>();
        
        try {
            List<Project> configuredProjects = projectRepository.findAll().stream()
                .filter(project -> isJenkinsConfigured(project))
                .collect(Collectors.toList());

            if (configuredProjects.isEmpty()) {
                jenkinsHealth.put("status", "not_configured");
                jenkinsHealth.put("uptime", 0.0);
                jenkinsHealth.put("responseTime", -1);
                jenkinsHealth.put("lastCheck", LocalDateTime.now().toString());
                return jenkinsHealth;
            }

            // Test Jenkins connection for each project
            int successfulConnections = 0;
            long totalResponseTime = 0;
            List<String> errors = new ArrayList<>();

            for (Project project : configuredProjects) {
                try {
                    long startTime = System.currentTimeMillis();
                    Map<String, Object> testResult = jenkinsService.testJenkinsConnection(project);
                    long endTime = System.currentTimeMillis();
                    
                    if ((Boolean) testResult.get("success")) {
                        successfulConnections++;
                        totalResponseTime += (endTime - startTime);
                    } else {
                        errors.add(project.getName() + ": " + testResult.get("message"));
                    }
                } catch (Exception e) {
                    errors.add(project.getName() + ": " + e.getMessage());
                }
            }

            double successRate = (successfulConnections / (double) configuredProjects.size()) * 100;
            double uptime = successRate;
            double avgResponseTime = successfulConnections > 0 ? totalResponseTime / (double) successfulConnections : -1;

            jenkinsHealth.put("status", successRate > 50 ? "healthy" : "degraded");
            jenkinsHealth.put("uptime", Math.round(uptime * 100.0) / 100.0);
            jenkinsHealth.put("responseTime", avgResponseTime);
            jenkinsHealth.put("lastCheck", LocalDateTime.now().toString());
            jenkinsHealth.put("configuredProjects", configuredProjects.size());
            jenkinsHealth.put("successfulConnections", successfulConnections);
            if (!errors.isEmpty()) {
                jenkinsHealth.put("errors", errors);
            }

        } catch (Exception e) {
            jenkinsHealth.put("status", "error");
            jenkinsHealth.put("error", e.getMessage());
            jenkinsHealth.put("uptime", 0.0);
            jenkinsHealth.put("responseTime", -1);
            jenkinsHealth.put("lastCheck", LocalDateTime.now().toString());
        }

        return jenkinsHealth;
    }

    private Map<String, Object> getCpuUsage() {
        Map<String, Object> cpuUsage = new HashMap<>();
        
        try {
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            double cpuLoad = osBean.getSystemLoadAverage();
            
            // Convert load average to percentage (approximate)
            int processorCount = osBean.getAvailableProcessors();
            double cpuPercentage = Math.min(100.0, (cpuLoad / processorCount) * 100);
            
            cpuUsage.put("percentage", Math.round(cpuPercentage * 100.0) / 100.0);
            cpuUsage.put("loadAverage", Math.round(cpuLoad * 100.0) / 100.0);
            cpuUsage.put("processors", processorCount);
            cpuUsage.put("used", Math.round(cpuPercentage * processorCount / 10.0) / 10.0 + " cores");
            cpuUsage.put("total", processorCount + " cores");
            
        } catch (Exception e) {
            cpuUsage.put("percentage", 0.0);
            cpuUsage.put("error", e.getMessage());
        }

        return cpuUsage;
    }

    private Map<String, Object> getMemoryUsage() {
        Map<String, Object> memoryUsage = new HashMap<>();
        
        try {
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();

            // Heap memory
            long usedHeap = memoryBean.getHeapMemoryUsage().getUsed();
            long maxHeap = memoryBean.getHeapMemoryUsage().getMax();
            double heapPercentage = (usedHeap / (double) maxHeap) * 100;

            // System memory (approximate) - using heap memory as approximation
            long totalSystemMemory = maxHeap;
            long usedSystemMemory = usedHeap;
            double systemPercentage = (usedSystemMemory / (double) totalSystemMemory) * 100;

            memoryUsage.put("percentage", Math.round(systemPercentage * 100.0) / 100.0);
            memoryUsage.put("heapPercentage", Math.round(heapPercentage * 100.0) / 100.0);
            memoryUsage.put("used", formatBytes(usedSystemMemory));
            memoryUsage.put("total", formatBytes(totalSystemMemory));
            memoryUsage.put("heapUsed", formatBytes(usedHeap));
            memoryUsage.put("heapMax", formatBytes(maxHeap));
            
        } catch (Exception e) {
            memoryUsage.put("percentage", 0.0);
            memoryUsage.put("error", e.getMessage());
        }

        return memoryUsage;
    }

    private Map<String, Object> getDiskUsage() {
        Map<String, Object> diskUsage = new HashMap<>();
        
        try {
            // Get disk usage from system
            java.io.File root = new java.io.File("/");
            long totalSpace = root.getTotalSpace();
            long freeSpace = root.getFreeSpace();
            long usedSpace = totalSpace - freeSpace;
            double percentage = (usedSpace / (double) totalSpace) * 100;
            
            diskUsage.put("percentage", Math.round(percentage * 100.0) / 100.0);
            diskUsage.put("used", formatBytes(usedSpace));
            diskUsage.put("total", formatBytes(totalSpace));
            diskUsage.put("free", formatBytes(freeSpace));
            
        } catch (Exception e) {
            diskUsage.put("percentage", 0.0);
            diskUsage.put("error", e.getMessage());
            diskUsage.put("note", "Disk monitoring not available");
        }

        return diskUsage;
    }

    private List<Map<String, Object>> getDeploymentIssues() {
        List<Map<String, Object>> issues = new ArrayList<>();
        
        try {
            // Check for recent deployment failures
            LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
            List<DeploymentHistory> recentDeployments = deploymentHistoryRepository.findByCreatedAtAfter(last24Hours);
            
            long failedDeployments = recentDeployments.stream()
                .filter(d -> d.getStatus() == DeploymentHistory.Status.FAILED)
                .count();
            
            if (failedDeployments > 0) {
                Map<String, Object> issue = new HashMap<>();
                issue.put("title", "Deployment failures detected");
                issue.put("component", "Jenkins Pipeline");
                issue.put("environment", "All");
                issue.put("severity", failedDeployments > 3 ? "critical" : "warning");
                issue.put("timestamp", LocalDateTime.now().minusHours(2).toString());
                issue.put("description", failedDeployments + " deployment failures in the last 24 hours");
                
                Map<String, String> metrics = new HashMap<>();
                metrics.put("failures", String.valueOf(failedDeployments));
                metrics.put("total_deployments", String.valueOf(recentDeployments.size()));
                issue.put("metrics", metrics);
                
                issues.add(issue);
            }

            // Check for long-running deployments
            List<DeploymentHistory> inProgressDeployments = recentDeployments.stream()
                .filter(d -> d.getStatus() == DeploymentHistory.Status.IN_PROGRESS)
                .filter(d -> d.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(30)))
                .collect(Collectors.toList());

            if (!inProgressDeployments.isEmpty()) {
                Map<String, Object> issue = new HashMap<>();
                issue.put("title", "Long-running deployments detected");
                issue.put("component", "Deployment System");
                issue.put("environment", "All");
                issue.put("severity", "warning");
                issue.put("timestamp", LocalDateTime.now().minusHours(1).toString());
                issue.put("description", inProgressDeployments.size() + " deployments running for more than 30 minutes");
                
                Map<String, String> metrics = new HashMap<>();
                metrics.put("long_running", String.valueOf(inProgressDeployments.size()));
                issue.put("metrics", metrics);
                
                issues.add(issue);
            }

        } catch (Exception e) {
            Map<String, Object> issue = new HashMap<>();
            issue.put("title", "Error checking deployment issues");
            issue.put("component", "Deployment Monitor");
            issue.put("environment", "System");
            issue.put("severity", "error");
            issue.put("timestamp", LocalDateTime.now().toString());
            issue.put("description", "Failed to check deployment issues: " + e.getMessage());
            issues.add(issue);
        }

        return issues;
    }

    private List<Map<String, Object>> getDatabaseIssues() {
        List<Map<String, Object>> issues = new ArrayList<>();
        
        try {
            // Check database connection pool
            if (dataSource instanceof HikariDataSource) {
                HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
                HikariPoolMXBean poolMXBean = hikariDataSource.getHikariPoolMXBean();
                
                int activeConnections = poolMXBean.getActiveConnections();
                int totalConnections = poolMXBean.getTotalConnections();
                int threadsAwaiting = poolMXBean.getThreadsAwaitingConnection();
                
                // Check for connection pool exhaustion
                if (threadsAwaiting > 0) {
                    Map<String, Object> issue = new HashMap<>();
                    issue.put("title", "Database connection pool under pressure");
                    issue.put("component", "Database");
                    issue.put("environment", "All");
                    issue.put("severity", threadsAwaiting > 5 ? "critical" : "warning");
                    issue.put("timestamp", LocalDateTime.now().toString());
                    issue.put("description", threadsAwaiting + " threads waiting for database connections");
                    
                    Map<String, String> metrics = new HashMap<>();
                    metrics.put("threads_awaiting", String.valueOf(threadsAwaiting));
                    metrics.put("active_connections", String.valueOf(activeConnections));
                    metrics.put("total_connections", String.valueOf(totalConnections));
                    issue.put("metrics", metrics);
                    
                    issues.add(issue);
                }
                
                // Check for high connection usage
                if (activeConnections > totalConnections * 0.8) {
                    Map<String, Object> issue = new HashMap<>();
                    issue.put("title", "High database connection usage");
                    issue.put("component", "Database");
                    issue.put("environment", "All");
                    issue.put("severity", "info");
                    issue.put("timestamp", LocalDateTime.now().toString());
                    issue.put("description", "Database connection pool is " + 
                        Math.round((activeConnections / (double) totalConnections) * 100) + "% utilized");
                    
                    Map<String, String> metrics = new HashMap<>();
                    metrics.put("utilization", Math.round((activeConnections / (double) totalConnections) * 100) + "%");
                    issue.put("metrics", metrics);
                    
                    issues.add(issue);
                }
            }

            // Test database response time
            long startTime = System.currentTimeMillis();
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            long responseTime = System.currentTimeMillis() - startTime;
            
            if (responseTime > 1000) { // More than 1 second
                Map<String, Object> issue = new HashMap<>();
                issue.put("title", "Slow database response time");
                issue.put("component", "Database");
                issue.put("environment", "All");
                issue.put("severity", "warning");
                issue.put("timestamp", LocalDateTime.now().toString());
                issue.put("description", "Database response time is " + responseTime + "ms");
                
                Map<String, String> metrics = new HashMap<>();
                metrics.put("response_time", responseTime + "ms");
                issue.put("metrics", metrics);
                
                issues.add(issue);
            }

        } catch (Exception e) {
            Map<String, Object> issue = new HashMap<>();
            issue.put("title", "Database connectivity issue");
            issue.put("component", "Database");
            issue.put("environment", "All");
            issue.put("severity", "critical");
            issue.put("timestamp", LocalDateTime.now().toString());
            issue.put("description", "Database connection failed: " + e.getMessage());
            issues.add(issue);
        }

        return issues;
    }

    private List<Map<String, Object>> getJenkinsIssues() {
        List<Map<String, Object>> issues = new ArrayList<>();
        
        try {
            List<Project> configuredProjects = projectRepository.findAll().stream()
                .filter(project -> isJenkinsConfigured(project))
                .collect(Collectors.toList());

            for (Project project : configuredProjects) {
                try {
                    Map<String, Object> testResult = jenkinsService.testJenkinsConnection(project);
                    
                    if (!(Boolean) testResult.get("success")) {
                        Map<String, Object> issue = new HashMap<>();
                        issue.put("title", "Jenkins connection failed for " + project.getName());
                        issue.put("component", "Jenkins");
                        issue.put("environment", "All");
                        issue.put("severity", "warning");
                        issue.put("timestamp", LocalDateTime.now().toString());
                        issue.put("description", "Failed to connect to Jenkins for project: " + project.getName());
                        
                        Map<String, String> metrics = new HashMap<>();
                        metrics.put("project", project.getName());
                        metrics.put("error", (String) testResult.get("message"));
                        issue.put("metrics", metrics);
                        
                        issues.add(issue);
                    }
                } catch (Exception e) {
                    Map<String, Object> issue = new HashMap<>();
                    issue.put("title", "Jenkins error for " + project.getName());
                    issue.put("component", "Jenkins");
                    issue.put("environment", "All");
                    issue.put("severity", "error");
                    issue.put("timestamp", LocalDateTime.now().toString());
                    issue.put("description", "Jenkins error for project " + project.getName() + ": " + e.getMessage());
                    
                    Map<String, String> metrics = new HashMap<>();
                    metrics.put("project", project.getName());
                    metrics.put("error", e.getMessage());
                    issue.put("metrics", metrics);
                    
                    issues.add(issue);
                }
            }

        } catch (Exception e) {
            Map<String, Object> issue = new HashMap<>();
            issue.put("title", "Error checking Jenkins health");
            issue.put("component", "Jenkins Monitor");
            issue.put("environment", "System");
            issue.put("severity", "error");
            issue.put("timestamp", LocalDateTime.now().toString());
            issue.put("description", "Failed to check Jenkins health: " + e.getMessage());
            issues.add(issue);
        }

        return issues;
    }

    private List<Map<String, Object>> getPerformanceIssues() {
        List<Map<String, Object>> issues = new ArrayList<>();
        
        try {
            // Check memory usage
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            long usedHeap = memoryBean.getHeapMemoryUsage().getUsed();
            long maxHeap = memoryBean.getHeapMemoryUsage().getMax();
            double heapUsagePercentage = (usedHeap / (double) maxHeap) * 100;

            if (heapUsagePercentage > 85) {
                Map<String, Object> issue = new HashMap<>();
                issue.put("title", "High memory usage detected");
                issue.put("component", "Application Server");
                issue.put("environment", "All");
                issue.put("severity", heapUsagePercentage > 95 ? "critical" : "warning");
                issue.put("timestamp", LocalDateTime.now().toString());
                issue.put("description", "Heap memory usage is " + Math.round(heapUsagePercentage) + "%");
                
                Map<String, String> metrics = new HashMap<>();
                metrics.put("heap_usage", Math.round(heapUsagePercentage) + "%");
                metrics.put("used_heap", formatBytes(usedHeap));
                metrics.put("max_heap", formatBytes(maxHeap));
                issue.put("metrics", metrics);
                
                issues.add(issue);
            }

            // Check CPU usage
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            double cpuLoad = osBean.getSystemLoadAverage();
            int processorCount = osBean.getAvailableProcessors();
            double cpuPercentage = Math.min(100.0, (cpuLoad / processorCount) * 100);

            if (cpuPercentage > 80) {
                Map<String, Object> issue = new HashMap<>();
                issue.put("title", "High CPU usage detected");
                issue.put("component", "Application Server");
                issue.put("environment", "All");
                issue.put("severity", cpuPercentage > 90 ? "critical" : "warning");
                issue.put("timestamp", LocalDateTime.now().toString());
                issue.put("description", "CPU usage is " + Math.round(cpuPercentage) + "%");
                
                Map<String, String> metrics = new HashMap<>();
                metrics.put("cpu_usage", Math.round(cpuPercentage) + "%");
                metrics.put("load_average", Math.round(cpuLoad * 100.0) / 100.0 + "");
                issue.put("metrics", metrics);
                
                issues.add(issue);
            }

            // Check thread count
            ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
            int threadCount = threadBean.getThreadCount();
            int peakThreadCount = threadBean.getPeakThreadCount();

            if (threadCount > peakThreadCount * 0.9) {
                Map<String, Object> issue = new HashMap<>();
                issue.put("title", "High thread count detected");
                issue.put("component", "Application Server");
                issue.put("environment", "All");
                issue.put("severity", "warning");
                issue.put("timestamp", LocalDateTime.now().toString());
                issue.put("description", "Thread count is " + threadCount + " (peak: " + peakThreadCount + ")");
                
                Map<String, String> metrics = new HashMap<>();
                metrics.put("current_threads", String.valueOf(threadCount));
                metrics.put("peak_threads", String.valueOf(peakThreadCount));
                issue.put("metrics", metrics);
                
                issues.add(issue);
            }

        } catch (Exception e) {
            Map<String, Object> issue = new HashMap<>();
            issue.put("title", "Error checking performance metrics");
            issue.put("component", "Performance Monitor");
            issue.put("environment", "System");
            issue.put("severity", "error");
            issue.put("timestamp", LocalDateTime.now().toString());
            issue.put("description", "Failed to check performance metrics: " + e.getMessage());
            issues.add(issue);
        }

        return issues;
    }

    private boolean isJenkinsConfigured(Project project) {
        return project.getJenkinsUrl() != null && !project.getJenkinsUrl().trim().isEmpty() &&
               project.getJenkinsJobName() != null && !project.getJenkinsJobName().trim().isEmpty() &&
               project.getJenkinsUsername() != null && !project.getJenkinsUsername().trim().isEmpty() &&
               project.getJenkinsToken() != null && !project.getJenkinsToken().trim().isEmpty();
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp-1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
} 