package com.cibofdevs.envpilot.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class FeatureFlagService {
    @Autowired
    private SystemSettingService systemSettingService;

    private Map<String, Object> getFeatures() {
        Object featuresObj = systemSettingService.getSystemSettings().get("features");
        if (featuresObj instanceof Map) {
            return (Map<String, Object>) featuresObj;
        }
        return null;
    }

    public boolean isAnalyticsEnabled() {
        Map<String, Object> features = getFeatures();
        return features != null && Boolean.TRUE.equals(features.get("analyticsEnabled"));
    }
    public boolean isUserRegistrationEnabled() {
        Map<String, Object> features = getFeatures();
        return features != null && Boolean.TRUE.equals(features.get("userRegistrationEnabled"));
    }

    public boolean isAuditLoggingEnabled() {
        Map<String, Object> features = getFeatures();
        return features != null && Boolean.TRUE.equals(features.get("auditLoggingEnabled"));
    }

    public boolean isEmailNotificationsEnabled() {
        Map<String, Object> features = getFeatures();
        return features != null && Boolean.TRUE.equals(features.get("emailNotificationsEnabled"));
    }

    public boolean isRealTimeMonitoringEnabled() {
        Map<String, Object> features = getFeatures();
        return features != null && Boolean.TRUE.equals(features.get("realTimeMonitoringEnabled"));
    }

    public void setAuditLoggingEnabled(boolean enabled) {
        systemSettingService.updateFeatureFlag("auditLoggingEnabled", enabled);
    }

    public void setEmailNotificationsEnabled(boolean enabled) {
        systemSettingService.updateFeatureFlag("emailNotificationsEnabled", enabled);
    }

    public void setRealTimeMonitoringEnabled(boolean enabled) {
        systemSettingService.updateFeatureFlag("realTimeMonitoringEnabled", enabled);
    }
} 