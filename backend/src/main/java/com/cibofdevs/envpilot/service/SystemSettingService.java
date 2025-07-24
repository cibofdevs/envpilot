package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.SystemSetting;
import com.cibofdevs.envpilot.repository.SystemSettingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SystemSettingService {

    @Autowired
    private SystemSettingRepository systemSettingRepository;

    @Autowired
    private ObjectMapper objectMapper;

    public Map<String, Object> getSystemSettings() {
        Map<String, Object> settings = new HashMap<>();
        
        // Get all settings from database
        List<SystemSetting> allSettings = systemSettingRepository.findAll();
        
        // Group settings by category
        Map<String, Object> application = new HashMap<>();
        Map<String, Object> security = new HashMap<>();
        Map<String, Object> features = new HashMap<>();
        Map<String, Object> database = new HashMap<>();
        
        for (SystemSetting setting : allSettings) {
            String key = setting.getKey();
            String value = setting.getValue();
            String type = setting.getType();
            
            // Parse value based on type
            Object parsedValue = parseValue(value, type);
            
            // Categorize settings
            if (key.startsWith("app.")) {
                application.put(key.substring(4), parsedValue);
            } else if (key.startsWith("security.")) {
                security.put(key.substring(9), parsedValue);
            } else if (key.startsWith("features.")) {
                features.put(key.substring(9), parsedValue);
            } else if (key.startsWith("database.")) {
                database.put(key.substring(9), parsedValue);
            }
        }
        
        // Set defaults if no settings found
        if (application.isEmpty()) {
            application.put("name", "EnvPilot");
            application.put("version", "v1.0.0");
        }
        
        if (security.isEmpty()) {
            security.put("jwtExpirationHours", 24);
            security.put("passwordMinLength", 6);
            security.put("maxLoginAttempts", 5);
            security.put("sessionTimeoutMinutes", 30);
        }
        
        if (features.isEmpty()) {
            features.put("analyticsEnabled", true);
            features.put("userRegistrationEnabled", true);
            features.put("emailNotificationsEnabled", false);
            features.put("auditLoggingEnabled", true);
        }
        
        if (database.isEmpty()) {
            database.put("connectionPoolSize", 10);
            database.put("queryTimeoutSeconds", 30);
            database.put("backupEnabled", true);
        }
        
        settings.put("appName", application.get("name"));
        settings.put("appVersion", application.get("version"));
        settings.put("security", security);
        settings.put("features", features);
        settings.put("database", database);
        
        return settings;
    }

    public void updateSystemSettings(Map<String, Object> settings) {
        // Update application settings
        if (settings.containsKey("appName")) {
            saveSetting("app.name", settings.get("appName").toString(), "Application name", "STRING");
        }
        
        if (settings.containsKey("appVersion")) {
            saveSetting("app.version", settings.get("appVersion").toString(), "Application version", "STRING");
        }
        
        // Update security settings
        if (settings.containsKey("security")) {
            Map<String, Object> security = (Map<String, Object>) settings.get("security");
            for (Map.Entry<String, Object> entry : security.entrySet()) {
                saveSetting("security." + entry.getKey(), entry.getValue().toString(), 
                           "Security setting: " + entry.getKey(), "INTEGER");
            }
        }
        
        // Update feature flags
        if (settings.containsKey("features")) {
            Map<String, Object> features = (Map<String, Object>) settings.get("features");
            for (Map.Entry<String, Object> entry : features.entrySet()) {
                saveSetting("features." + entry.getKey(), entry.getValue().toString(), 
                           "Feature flag: " + entry.getKey(), "BOOLEAN");
            }
        }
        
        // Update database settings
        if (settings.containsKey("database")) {
            Map<String, Object> database = (Map<String, Object>) settings.get("database");
            for (Map.Entry<String, Object> entry : database.entrySet()) {
                saveSetting("database." + entry.getKey(), entry.getValue().toString(), 
                           "Database setting: " + entry.getKey(), "INTEGER");
            }
        }
    }

    private void saveSetting(String key, String value, String description, String type) {
        Optional<SystemSetting> existingSetting = systemSettingRepository.findByKey(key);
        
        if (existingSetting.isPresent()) {
            // Update existing setting
            SystemSetting setting = existingSetting.get();
            setting.setValue(value);
            setting.setDescription(description);
            setting.setUpdatedAt(LocalDateTime.now());
            systemSettingRepository.save(setting);
        } else {
            // Create new setting
            SystemSetting setting = new SystemSetting();
            setting.setKey(key);
            setting.setValue(value);
            setting.setDescription(description);
            setting.setType(type);
            systemSettingRepository.save(setting);
        }
    }

    private Object parseValue(String value, String type) {
        try {
            switch (type) {
                case "BOOLEAN":
                    return Boolean.parseBoolean(value);
                case "INTEGER":
                    return Integer.parseInt(value);
                case "JSON":
                    return objectMapper.readValue(value, Object.class);
                default:
                    return value;
            }
        } catch (Exception e) {
            return value; // Return as string if parsing fails
        }
    }

    public void initializeDefaultSettings() {
        // Only initialize if no settings exist
        if (systemSettingRepository.count() == 0) {
            // Application settings
            saveSetting("app.name", "EnvPilot", "Application name", "STRING");
            saveSetting("app.version", "v1.0.0", "Application version", "STRING");
            
            // Security settings
            saveSetting("security.jwtExpirationHours", "24", "JWT token expiration in hours", "INTEGER");
            saveSetting("security.passwordMinLength", "6", "Minimum password length", "INTEGER");
            saveSetting("security.maxLoginAttempts", "5", "Maximum login attempts", "INTEGER");
            saveSetting("security.sessionTimeoutMinutes", "30", "Session timeout in minutes", "INTEGER");
            
            // Feature flags
            saveSetting("features.analyticsEnabled", "true", "Enable analytics features", "BOOLEAN");
            saveSetting("features.userRegistrationEnabled", "true", "Enable user registration", "BOOLEAN");
            saveSetting("features.emailNotificationsEnabled", "false", "Enable email notifications", "BOOLEAN");
            saveSetting("features.auditLoggingEnabled", "true", "Enable audit logging", "BOOLEAN");
            saveSetting("features.realTimeMonitoringEnabled", "true", "Enable real-time monitoring", "BOOLEAN");
            
            // Database settings
            saveSetting("database.connectionPoolSize", "10", "Database connection pool size", "INTEGER");
            saveSetting("database.queryTimeoutSeconds", "30", "Database query timeout", "INTEGER");
            saveSetting("database.backupEnabled", "true", "Enable database backup", "BOOLEAN");
        }
    }

    /**
     * Update a specific feature flag
     */
    public void updateFeatureFlag(String flagName, boolean enabled) {
        saveSetting("features." + flagName, String.valueOf(enabled), 
                   "Feature flag: " + flagName, "BOOLEAN");
    }
} 