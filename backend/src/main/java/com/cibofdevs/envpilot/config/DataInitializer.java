package com.cibofdevs.envpilot.config;

import com.cibofdevs.envpilot.model.*;
import com.cibofdevs.envpilot.repository.*;
import com.cibofdevs.envpilot.service.SystemSettingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
public class DataInitializer implements CommandLineRunner {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SystemSettingService systemSettingService;
    


    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private EnvironmentRepository environmentRepository;

    @Autowired
    private FeatureFlagRepository featureFlagRepository;

    @Autowired
    private ConfigurationRepository configurationRepository;

    @Autowired
    private EnvironmentAssignmentRepository environmentAssignmentRepository;

    @Override
    public void run(String... args) {
        // Initialize default settings
        systemSettingService.initializeDefaultSettings();
        

        
        // Check if users exist
        if (userRepository.count() == 0) {
            createSampleUsers();
        }

        // Debug: Check data counts
        System.out.println("=== DataInitializer Debug ===");
        System.out.println("Total Users: " + userRepository.count());
        System.out.println("Total Projects: " + projectRepository.count());
        System.out.println("Total Environments: " + environmentRepository.count());
        System.out.println("Total Feature Flags: " + featureFlagRepository.count());
        System.out.println("Total Configurations: " + configurationRepository.count());
        System.out.println("Total Environment Assignments: " + environmentAssignmentRepository.count());
    }

    private void createSampleUsers() {
        User admin = new User();
        admin.setName("Admin User");
        admin.setEmail("admin@envpilot.com");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setRole(User.Role.ADMIN);
        userRepository.save(admin);
        
        // Create sample developer user
        User developer = new User();
        developer.setName("John Doe");
        developer.setEmail("john.doe@envpilot.com");
        developer.setPassword(passwordEncoder.encode("developer123"));
        developer.setRole(User.Role.DEVELOPER);
        userRepository.save(developer);
        
        System.out.println("Created sample users: Admin and John Doe (Developer)");
    }
}