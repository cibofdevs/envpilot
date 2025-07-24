package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.dto.EnvironmentAssignmentRequest;
import com.cibofdevs.envpilot.dto.EnvironmentAssignmentResponse;
import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.model.EnvironmentAssignment;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.EnvironmentAssignmentRepository;
import com.cibofdevs.envpilot.repository.EnvironmentRepository;
import com.cibofdevs.envpilot.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class EnvironmentAssignmentService {
    
    @Autowired
    private EnvironmentAssignmentRepository environmentAssignmentRepository;
    
    @Autowired
    private EnvironmentRepository environmentRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    /**
     * Assign users to a specific environment
     */
    public boolean assignUsersToEnvironment(EnvironmentAssignmentRequest request, User adminUser) {
        try {
            // Validate that the user performing the assignment is an admin
            if (adminUser.getRole() != User.Role.ADMIN) {
                System.err.println("Non-admin user attempted to assign environment: " + adminUser.getEmail());
                return false;
            }
            
            // Validate environment exists
            Optional<Environment> environmentOpt = environmentRepository.findById(request.getEnvironmentId());
            if (environmentOpt.isEmpty()) {
                return false;
            }
            
            Environment environment = environmentOpt.get();
            
            // Process each user
            for (Long userId : request.getUserIds()) {
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    
                    // Check if assignment already exists
                    Optional<EnvironmentAssignment> existingAssignment = 
                        environmentAssignmentRepository.findByEnvironmentIdAndUserId(request.getEnvironmentId(), userId);
                    
                    if (existingAssignment.isPresent()) {
                        // Update existing assignment
                        EnvironmentAssignment assignment = existingAssignment.get();
                        assignment.setRole(user.getRole()); // Use user's original role
                        assignment.setNotes(request.getNotes());
                        assignment.setStatus(EnvironmentAssignment.Status.ACTIVE);
                        environmentAssignmentRepository.save(assignment);
                    } else {
                        // Create new assignment
                        EnvironmentAssignment assignment = new EnvironmentAssignment();
                        assignment.setEnvironment(environment);
                        assignment.setUser(user);
                        assignment.setAssignedBy(adminUser);
                        assignment.setRole(user.getRole()); // Use user's original role
                        assignment.setNotes(request.getNotes());
                        assignment.setStatus(EnvironmentAssignment.Status.ACTIVE);
                        environmentAssignmentRepository.save(assignment);
                        
                        // Log the assignment for debugging
                        System.out.println("Environment assignment created:");
                        System.out.println("  User: " + user.getName() + " (" + user.getEmail() + ")");
                        System.out.println("  User Role: " + user.getRole());
                        System.out.println("  Environment: " + environment.getName());
                        System.out.println("  Assigned By: " + adminUser.getName());
                        System.out.println("  Assignment Role: " + assignment.getRole());
                    }
                    
                    // Create notification for user
                    notificationService.createNotification(
                        user,
                        "Environment Assignment",
                        "You have been assigned to environment '" + environment.getName() + "' in project '" + 
                        environment.getProject().getName() + "' by " + adminUser.getName(),
                        "info"
                    );
                }
            }
            
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * Remove user from environment
     */
    public boolean removeUserFromEnvironment(Long environmentId, Long userId, User adminUser) {
        try {
            Optional<EnvironmentAssignment> assignmentOpt = 
                environmentAssignmentRepository.findByEnvironmentIdAndUserId(environmentId, userId);
            
            if (assignmentOpt.isPresent()) {
                EnvironmentAssignment assignment = assignmentOpt.get();
                assignment.setStatus(EnvironmentAssignment.Status.REVOKED);
                environmentAssignmentRepository.save(assignment);
                
                // Create notification for user
                notificationService.createNotification(
                    assignment.getUser(),
                    "Environment Access Revoked",
                    "Your access to environment '" + assignment.getEnvironment().getName() + 
                    "' in project '" + assignment.getEnvironment().getProject().getName() + 
                    "' has been revoked by " + adminUser.getName(),
                    "warning"
                );
                
                return true;
            }
            
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    /**
     * Get all assignments for a specific environment
     */
    public List<EnvironmentAssignmentResponse> getEnvironmentAssignments(Long environmentId) {
        List<EnvironmentAssignment> assignments = environmentAssignmentRepository.findByEnvironmentId(environmentId);
        return assignments.stream()
            .filter(assignment -> assignment.getStatus() == EnvironmentAssignment.Status.ACTIVE)
            .map(this::convertToResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Get all assignments for a specific project
     */
    public List<EnvironmentAssignmentResponse> getProjectEnvironmentAssignments(Long projectId) {
        List<EnvironmentAssignment> assignments = environmentAssignmentRepository.findByProjectId(projectId);
        return assignments.stream()
            .filter(assignment -> assignment.getStatus() == EnvironmentAssignment.Status.ACTIVE)
            .map(this::convertToResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Get all assignments for a specific user
     */
    public List<EnvironmentAssignmentResponse> getUserEnvironmentAssignments(Long userId) {
        List<EnvironmentAssignment> assignments = environmentAssignmentRepository.findByUserId(userId);
        return assignments.stream()
            .filter(assignment -> assignment.getStatus() == EnvironmentAssignment.Status.ACTIVE)
            .map(this::convertToResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Check if user has access to a specific environment
     */
    public boolean hasUserAccessToEnvironment(Long userId, Long environmentId) {
        return environmentAssignmentRepository.existsByEnvironmentIdAndUserIdAndStatus(environmentId, userId, EnvironmentAssignment.Status.ACTIVE);
    }
    
    /**
     * Get active assignments for a specific environment
     */
    public List<EnvironmentAssignmentResponse> getActiveEnvironmentAssignments(Long environmentId) {
        List<EnvironmentAssignment> assignments = environmentAssignmentRepository.findActiveAssignmentsByEnvironmentId(environmentId);
        return assignments.stream()
            .map(this::convertToResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Convert EnvironmentAssignment to EnvironmentAssignmentResponse
     */
    private EnvironmentAssignmentResponse convertToResponse(EnvironmentAssignment assignment) {
        EnvironmentAssignmentResponse response = new EnvironmentAssignmentResponse();
        response.setId(assignment.getId());
        response.setEnvironmentId(assignment.getEnvironment().getId());
        response.setEnvironmentName(assignment.getEnvironment().getName());
        response.setProjectId(assignment.getEnvironment().getProject().getId());
        response.setProjectName(assignment.getEnvironment().getProject().getName());
        response.setUserId(assignment.getUser().getId());
        response.setUserName(assignment.getUser().getName());
        response.setUserEmail(assignment.getUser().getEmail());
        response.setAssignedById(assignment.getAssignedBy().getId());
        response.setAssignedByName(assignment.getAssignedBy().getName());
        response.setRole(assignment.getRole().name());
        response.setAssignedAt(assignment.getAssignedAt());
        response.setNotes(assignment.getNotes());
        response.setStatus(assignment.getStatus().name());
        return response;
    }
} 