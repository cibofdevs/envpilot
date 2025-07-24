package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.Project;
import com.cibofdevs.envpilot.model.ProjectAssignment;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.ProjectAssignmentRepository;
import com.cibofdevs.envpilot.repository.ProjectRepository;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.cibofdevs.envpilot.dto.ProjectAssignmentRequest;
import com.cibofdevs.envpilot.dto.ProjectAssignmentResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ProjectAssignmentService {

    @Autowired
    private ProjectAssignmentRepository projectAssignmentRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Assign users to a project
     */
    @Transactional
    public Map<String, Object> assignUsersToProject(Long projectId, ProjectAssignmentRequest request, Long adminId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Check if project exists
            Optional<Project> projectOpt = projectRepository.findById(projectId);
            if (projectOpt.isEmpty()) {
                result.put("success", false);
                result.put("message", "Project not found");
                return result;
            }
            
            Project project = projectOpt.get();
            List<ProjectAssignmentResponse> assignments = new ArrayList<>();
            List<String> errors = new ArrayList<>();
            
            // Get admin user
            Optional<User> adminOpt = userRepository.findById(adminId);
            if (adminOpt.isEmpty()) {
                result.put("success", false);
                result.put("message", "Admin user not found");
                return result;
            }
            
            User admin = adminOpt.get();
            
            for (Long userId : request.getUserIds()) {
                try {
                    // Check if user exists
                    Optional<User> userOpt = userRepository.findById(userId);
                    if (userOpt.isEmpty()) {
                        errors.add("User with ID " + userId + " not found");
                        continue;
                    }
                    
                    User user = userOpt.get();
                    
                    // Check if assignment already exists
                    Optional<ProjectAssignment> existingAssignment = 
                        projectAssignmentRepository.findByProjectIdAndUserId(projectId, userId);
                    
                    if (existingAssignment.isPresent()) {
                        // Update existing assignment
                        ProjectAssignment assignment = existingAssignment.get();
                        assignment.setRole(ProjectAssignment.AssignmentRole.valueOf(request.getRole().toUpperCase()));
                        assignment.setNotes(request.getNotes());
                        assignment = projectAssignmentRepository.save(assignment);
                        
                        assignments.add(convertToResponse(assignment, project, user, admin));
                    } else {
                        // Create new assignment
                        ProjectAssignment assignment = new ProjectAssignment();
                        assignment.setProject(project);
                        assignment.setUser(user);
                        assignment.setRole(ProjectAssignment.AssignmentRole.valueOf(request.getRole().toUpperCase()));
                        assignment.setAssignedBy(adminId);
                        assignment.setNotes(request.getNotes());
                        
                        assignment = projectAssignmentRepository.save(assignment);
                        assignments.add(convertToResponse(assignment, project, user, admin));
                        
                        // Create notification for assigned user
                        try {
                            notificationService.createNotification(
                                user,
                                "Project Assignment",
                                "You have been assigned to project '" + project.getName() + "' with role: " + request.getRole(),
                                "info"
                            );
                        } catch (Exception e) {
                            System.err.println("Failed to create notification for user " + user.getEmail() + ": " + e.getMessage());
                        }
                    }
                    
                } catch (Exception e) {
                    errors.add("Failed to assign user " + userId + ": " + e.getMessage());
                }
            }
            
            result.put("success", true);
            result.put("assignments", assignments);
            result.put("errors", errors);
            result.put("message", "Project assignment completed. " + assignments.size() + " users assigned successfully.");
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error assigning users to project: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * Get all assignments for a project
     */
    public Map<String, Object> getProjectAssignments(Long projectId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            List<ProjectAssignment> assignments = projectAssignmentRepository.findByProjectId(projectId);
            List<ProjectAssignmentResponse> responses = new ArrayList<>();
            
            for (ProjectAssignment assignment : assignments) {
                Optional<User> adminOpt = userRepository.findById(assignment.getAssignedBy());
                String adminName = adminOpt.map(User::getName).orElse("Unknown");
                
                responses.add(convertToResponse(assignment, assignment.getProject(), assignment.getUser(), adminOpt.orElse(null)));
            }
            
            result.put("success", true);
            result.put("assignments", responses);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error fetching project assignments: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * Remove user assignment from project
     */
    @Transactional
    public Map<String, Object> removeUserFromProject(Long projectId, Long userId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Check if assignment exists
            Optional<ProjectAssignment> assignmentOpt = projectAssignmentRepository.findByProjectIdAndUserId(projectId, userId);
            if (assignmentOpt.isEmpty()) {
                result.put("success", false);
                result.put("message", "Assignment not found");
                return result;
            }
            
            ProjectAssignment assignment = assignmentOpt.get();
            
            // Don't allow removing the project owner
            if (assignment.getRole() == ProjectAssignment.AssignmentRole.OWNER) {
                result.put("success", false);
                result.put("message", "Cannot remove project owner");
                return result;
            }
            
            projectAssignmentRepository.delete(assignment);
            
            result.put("success", true);
            result.put("message", "User removed from project successfully");
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error removing user from project: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * Get all projects assigned to a user
     */
    public Map<String, Object> getUserProjects(Long userId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            List<ProjectAssignment> assignments = projectAssignmentRepository.findByUserId(userId);
            List<Map<String, Object>> projects = new ArrayList<>();
            
            for (ProjectAssignment assignment : assignments) {
                Map<String, Object> projectInfo = new HashMap<>();
                projectInfo.put("projectId", assignment.getProject().getId());
                projectInfo.put("projectName", assignment.getProject().getName());
                projectInfo.put("role", assignment.getRole().toString());
                projectInfo.put("assignedAt", assignment.getAssignedAt());
                projects.add(projectInfo);
            }
            
            result.put("success", true);
            result.put("projects", projects);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error fetching user projects: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * Check if user has access to project
     */
    public boolean hasProjectAccess(Long userId, Long projectId) {
        return projectAssignmentRepository.existsByProjectIdAndUserId(projectId, userId);
    }

    /**
     * Get user role in project
     */
    public Optional<ProjectAssignment.AssignmentRole> getUserProjectRole(Long userId, Long projectId) {
        Optional<ProjectAssignment> assignment = projectAssignmentRepository.findByProjectIdAndUserId(projectId, userId);
        return assignment.map(ProjectAssignment::getRole);
    }

    /**
     * Get all users assigned to a project
     */
    public List<User> getUsersAssignedToProject(Long projectId) {
        List<ProjectAssignment> assignments = projectAssignmentRepository.findByProjectId(projectId);
        List<User> users = new ArrayList<>();
        
        for (ProjectAssignment assignment : assignments) {
            users.add(assignment.getUser());
        }
        
        return users;
    }

    private ProjectAssignmentResponse convertToResponse(ProjectAssignment assignment, Project project, User user, User admin) {
        ProjectAssignmentResponse response = new ProjectAssignmentResponse();
        response.setId(assignment.getId());
        response.setProjectId(project.getId());
        response.setProjectName(project.getName());
        response.setUserId(user.getId());
        response.setUserName(user.getName());
        response.setUserEmail(user.getEmail());
        response.setRole(assignment.getRole().toString());
        response.setAssignedAt(assignment.getAssignedAt());
        response.setAssignedBy(admin != null ? admin.getName() : "Unknown");
        response.setNotes(assignment.getNotes());
        return response;
    }
} 