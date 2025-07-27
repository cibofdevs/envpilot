package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.cibofdevs.envpilot.dto.UserProfileUpdateRequest;
import com.cibofdevs.envpilot.dto.PasswordChangeRequest;
import com.cibofdevs.envpilot.service.SystemSettingService;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import com.cibofdevs.envpilot.service.EmailService;
import com.cibofdevs.envpilot.service.JenkinsBuildMonitorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/settings")
@Tag(name = "Settings", description = "System and user settings management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class SettingsController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SystemSettingService systemSettingService;

    @Autowired
    private FeatureFlagService featureFlagService;

    @Autowired
    private EmailService emailService;
    
    @Autowired
    private JenkinsBuildMonitorService jenkinsBuildMonitorService;

    // System Settings (Admin only)
    @GetMapping("/system")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get System Settings",
        description = "Retrieve system-wide settings. Admin access required."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "System settings retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "System Settings",
                        value = "{\"appName\": \"EnvPilot\", \"appVersion\": \"v1.0.0\", \"features\": {\"userRegistration\": true, \"auditLogging\": true}}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - Admin role required"
        )
    })
    public ResponseEntity<Map<String, Object>> getSystemSettings() {
        Map<String, Object> settings = systemSettingService.getSystemSettings();
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/system")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateSystemSettings(@RequestBody Map<String, Object> settings, Authentication authentication) {
        // Validate required fields
        if (settings.get("appName") == null || settings.get("appName").toString().trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Application name is required");
            return ResponseEntity.badRequest().body(error);
        }
        
        if (settings.get("appVersion") == null || settings.get("appVersion").toString().trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Application version is required");
            return ResponseEntity.badRequest().body(error);
        }
        
        try {
            // Save settings to database
            systemSettingService.updateSystemSettings(settings);
            
            // Audit logging for system settings update
            if (featureFlagService.isAuditLoggingEnabled()) {
                String adminEmail = authentication.getName();
                Optional<User> adminUser = userRepository.findByEmail(adminEmail);
                if (adminUser.isPresent()) {
                    System.out.println("📋 AUDIT LOG: System settings updated");
                    System.out.println("   Admin: " + adminUser.get().getName() + " (" + adminUser.get().getEmail() + ")");
                    System.out.println("   Settings: " + settings.keySet());
                    System.out.println("   Timestamp: " + LocalDateTime.now());
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "System settings updated successfully");
            response.put("updatedAt", LocalDateTime.now());
            response.put("settings", settings);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to update system settings: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // User Profile Settings
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getUserProfile(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (!userOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = userOpt.get();
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole());
        profile.put("profilePhoto", user.getProfilePhoto());
        profile.put("createdAt", user.getCreatedAt());
        profile.put("updatedAt", user.getUpdatedAt());
        profile.put("lastLogin", user.getLastLogin());
        
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateUserProfile(
            @RequestBody UserProfileUpdateRequest request,
            Authentication authentication) {
        
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (!userOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = userOpt.get();
        
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName());
        }
        
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            // Check if new email already exists
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Email already exists");
                return ResponseEntity.badRequest().body(error);
            }
            user.setEmail(request.getEmail());
        }
        
        user.setUpdatedAt(LocalDateTime.now());
        User updatedUser = userRepository.save(user);
        
        // Audit logging for user profile update
        if (featureFlagService.isAuditLoggingEnabled()) {
            System.out.println("📋 AUDIT LOG: User profile updated");
            System.out.println("   User: " + updatedUser.getName() + " (" + updatedUser.getEmail() + ")");
            System.out.println("   Changes: " + (request.getName() != null ? "Name updated, " : "") + 
                             (request.getEmail() != null ? "Email updated" : ""));
            System.out.println("   Timestamp: " + LocalDateTime.now());
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Profile updated successfully");
        response.put("user", Map.of(
            "id", updatedUser.getId(),
            "name", updatedUser.getName(),
            "email", updatedUser.getEmail(),
            "role", updatedUser.getRole(),
            "updatedAt", updatedUser.getUpdatedAt()
        ));
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestBody PasswordChangeRequest request,
            Authentication authentication) {
        
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (!userOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = userOpt.get();
        
        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Current password is incorrect");
            return ResponseEntity.badRequest().body(error);
        }
        
        // Validate new password
        if (request.getNewPassword().length() < 6) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "New password must be at least 6 characters long");
            return ResponseEntity.badRequest().body(error);
        }
        
        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        
        // Audit logging for password change
        if (featureFlagService.isAuditLoggingEnabled()) {
            System.out.println("📋 AUDIT LOG: User password changed");
            System.out.println("   User: " + user.getName() + " (" + user.getEmail() + ")");
            System.out.println("   Timestamp: " + LocalDateTime.now());
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password changed successfully");
        response.put("updatedAt", LocalDateTime.now());
        
        return ResponseEntity.ok(response);
    }

    // Application Preferences
    @GetMapping("/preferences")
    public ResponseEntity<Map<String, Object>> getUserPreferences(Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (!userOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        String prefStr = user.getPreferences();
        Map<String, Object> preferences;
        try {
            if (prefStr != null && !prefStr.isEmpty()) {
                preferences = objectMapper.readValue(prefStr, Map.class);
            } else {
                // fallback default
                preferences = getDefaultPreferences();
            }
        } catch (Exception e) {
            preferences = getDefaultPreferences();
        }
        return ResponseEntity.ok(preferences);
    }

    @PutMapping("/preferences")
    public ResponseEntity<Map<String, Object>> updateUserPreferences(
            @RequestBody Map<String, Object> preferences,
            Authentication authentication) {
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (!userOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        try {
            String json = objectMapper.writeValueAsString(preferences);
            user.setPreferences(json);
            userRepository.save(user);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to save preferences");
            return ResponseEntity.badRequest().body(error);
        }
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Preferences updated successfully");
        response.put("updatedAt", LocalDateTime.now());
        response.put("preferences", preferences);
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> getDefaultPreferences() {
        Map<String, Object> preferences = new HashMap<>();
        Map<String, Object> ui = new HashMap<>();
        ui.put("theme", "light");
        ui.put("language", "en");
        ui.put("timezone", "UTC");
        ui.put("dateFormat", "MM/dd/yyyy");
        ui.put("itemsPerPage", 10);
        preferences.put("ui", ui);
        Map<String, Object> dashboard = new HashMap<>();
        // Hapus defaultView
        dashboard.put("autoRefresh", true);
        dashboard.put("refreshInterval", 30);
        preferences.put("dashboard", dashboard);
        return preferences;
    }

    // Application Info (accessible by all users)
    @GetMapping("/app-info")
    @Operation(
        summary = "Get Application Info",
        description = "Retrieve basic application information accessible by all users."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Application info retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Application Info",
                        value = "{\"appName\": \"Multi-Project Environment Manager\", \"appVersion\": \"v1.0.0\"}"
                    )
                }
            )
        )
    })
    public ResponseEntity<Map<String, Object>> getAppInfo() {
        Map<String, Object> appInfo = new HashMap<>();
        
        try {
            // Try to get from system settings first
            Map<String, Object> settings = systemSettingService.getSystemSettings();
            appInfo.put("appName", settings.getOrDefault("appName", "Multi-Project Environment Manager"));
            appInfo.put("appVersion", settings.getOrDefault("appVersion", "v1.0.0"));
        } catch (Exception e) {
            // Fallback to default values if system settings are not accessible
            appInfo.put("appName", "Multi-Project Environment Manager");
            appInfo.put("appVersion", "v1.0.0");
        }
        
        return ResponseEntity.ok(appInfo);
    }

    @GetMapping("/feature-flags")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get Feature Flags",
        description = "Retrieve all feature flags and their current status"
    )
    public ResponseEntity<Map<String, Object>> getFeatureFlags() {
        Map<String, Object> response = new HashMap<>();
        response.put("auditLogging", featureFlagService.isAuditLoggingEnabled());
        response.put("emailNotifications", featureFlagService.isEmailNotificationsEnabled());
        response.put("realTimeMonitoring", featureFlagService.isRealTimeMonitoringEnabled());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/feature-flags/audit-logging")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Toggle Audit Logging",
        description = "Enable or disable audit logging feature"
    )
    public ResponseEntity<Map<String, Object>> toggleAuditLogging(@RequestParam boolean enabled) {
        featureFlagService.setAuditLoggingEnabled(enabled);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Audit logging " + (enabled ? "enabled" : "disabled"));
        response.put("auditLogging", enabled);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/feature-flags/email-notifications")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Toggle Email Notifications",
        description = "Enable or disable email notifications feature"
    )
    public ResponseEntity<Map<String, Object>> toggleEmailNotifications(@RequestParam boolean enabled) {
        featureFlagService.setEmailNotificationsEnabled(enabled);
        System.out.println("🔧 Email notifications " + (enabled ? "ENABLED" : "DISABLED") + " by admin");
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Email notifications " + (enabled ? "enabled" : "disabled"));
        response.put("emailNotifications", enabled);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/feature-flags/real-time-monitoring")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Toggle Real-time Monitoring",
        description = "Enable or disable real-time monitoring feature"
    )
    public ResponseEntity<Map<String, Object>> toggleRealTimeMonitoring(@RequestParam boolean enabled) {
        featureFlagService.setRealTimeMonitoringEnabled(enabled);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Real-time monitoring " + (enabled ? "enabled" : "disabled"));
        response.put("realTimeMonitoring", enabled);
        return ResponseEntity.ok(response);
    }



    @GetMapping("/system-info")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get System Information",
        description = "Retrieve system information and configuration details"
    )
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        Map<String, Object> response = new HashMap<>();
        response.put("javaVersion", System.getProperty("java.version"));
        response.put("osName", System.getProperty("os.name"));
        response.put("osVersion", System.getProperty("os.version"));
        response.put("userTimezone", System.getProperty("user.timezone"));
        response.put("availableProcessors", Runtime.getRuntime().availableProcessors());
        response.put("totalMemory", Runtime.getRuntime().totalMemory());
        response.put("freeMemory", Runtime.getRuntime().freeMemory());
        response.put("maxMemory", Runtime.getRuntime().maxMemory());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/jenkins-monitoring")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get Jenkins Build Monitoring Stats",
        description = "Retrieve real-time Jenkins build monitoring statistics."
    )
    public ResponseEntity<Map<String, Object>> getJenkinsMonitoringStats() {
        Map<String, Object> stats = jenkinsBuildMonitorService.getMonitoringStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/system-monitoring")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get System Monitoring Data",
        description = "Retrieve real-time system monitoring data including health, resources, and issues."
    )
    public ResponseEntity<Map<String, Object>> getSystemMonitoring() {
        Map<String, Object> monitoring = new HashMap<>();
        
        try {
            // Get system health
            Map<String, Object> health = new HashMap<>();
            
            // Database health
            try {
                long startTime = System.currentTimeMillis();
                userRepository.count();
                long endTime = System.currentTimeMillis();
                long responseTime = endTime - startTime;
                
                health.put("database", Map.of(
                    "status", "healthy",
                    "responseTime", responseTime + "ms",
                    "lastCheck", LocalDateTime.now().toString()
                ));
            } catch (Exception e) {
                health.put("database", Map.of(
                    "status", "error",
                    "error", e.getMessage(),
                    "lastCheck", LocalDateTime.now().toString()
                ));
            }
            
            // Application health
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            long usedMemory = memoryBean.getHeapMemoryUsage().getUsed();
            long maxMemory = memoryBean.getHeapMemoryUsage().getMax();
            double memoryUsage = (usedMemory / (double) maxMemory) * 100;
            
            health.put("application", Map.of(
                "status", memoryUsage > 90 ? "warning" : "healthy",
                "memoryUsage", Math.round(memoryUsage * 100.0) / 100.0 + "%",
                "usedMemory", formatBytes(usedMemory),
                "maxMemory", formatBytes(maxMemory),
                "lastCheck", LocalDateTime.now().toString()
            ));
            
            monitoring.put("health", health);
            
            // Resource usage
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            double cpuLoad = osBean.getSystemLoadAverage();
            int processorCount = osBean.getAvailableProcessors();
            double cpuPercentage = Math.min(100.0, (cpuLoad / processorCount) * 100);
            
            Map<String, Object> resources = new HashMap<>();
            resources.put("cpu", Map.of(
                "usage", Math.round(cpuPercentage * 100.0) / 100.0 + "%",
                "loadAverage", Math.round(cpuLoad * 100.0) / 100.0,
                "processors", processorCount
            ));
            
            resources.put("memory", Map.of(
                "usage", Math.round(memoryUsage * 100.0) / 100.0 + "%",
                "used", formatBytes(usedMemory),
                "total", formatBytes(maxMemory)
            ));
            
            monitoring.put("resources", resources);
            
            // System issues
            List<Map<String, Object>> issues = new ArrayList<>();
            
            // Check for memory issues
            if (memoryUsage > 85) {
                issues.add(Map.of(
                    "title", "High memory usage",
                    "severity", memoryUsage > 95 ? "critical" : "warning",
                    "description", "Memory usage is " + Math.round(memoryUsage) + "%",
                    "timestamp", LocalDateTime.now().toString()
                ));
            }
            
            // Check for CPU issues
            if (cpuPercentage > 80) {
                issues.add(Map.of(
                    "title", "High CPU usage",
                    "severity", cpuPercentage > 90 ? "critical" : "warning",
                    "description", "CPU usage is " + Math.round(cpuPercentage) + "%",
                    "timestamp", LocalDateTime.now().toString()
                ));
            }
            
            monitoring.put("issues", issues);
            monitoring.put("timestamp", LocalDateTime.now().toString());
            
            return ResponseEntity.ok(monitoring);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get system monitoring data: " + e.getMessage());
            error.put("timestamp", LocalDateTime.now().toString());
            return ResponseEntity.status(500).body(error);
        }
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp-1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}
