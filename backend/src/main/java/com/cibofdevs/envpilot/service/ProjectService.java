package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.Project;
import com.cibofdevs.envpilot.repository.ProjectRepository;
import com.cibofdevs.envpilot.repository.ProjectAssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ProjectService {
    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectAssignmentRepository projectAssignmentRepository;

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public Optional<Project> getProjectById(Long id) {
        return projectRepository.findById(id);
    }

    public List<Project> searchProjects(String keyword) {
        return projectRepository.findByNameOrDescriptionContaining(keyword);
    }

    public Project createProject(Project project) {
        return projectRepository.save(project);
    }

    public Project updateProject(Project project) {
        return projectRepository.save(project);
    }

    public void deleteProject(Long id) {
        projectRepository.deleteById(id);
    }

    public boolean existsById(Long id) {
        return projectRepository.existsById(id);
    }

    /**
     * Get projects assigned to a specific user
     */
    public List<Project> getProjectsByUserId(Long userId) {
        return projectAssignmentRepository.findByUserId(userId)
            .stream()
            .map(assignment -> assignment.getProject())
            .collect(Collectors.toList());
    }

    /**
     * Check if user has access to a specific project
     */
    public boolean hasUserAccessToProject(Long userId, Long projectId) {
        return projectAssignmentRepository.existsByProjectIdAndUserId(projectId, userId);
    }

    /**
     * Search projects by keyword for a specific user (only assigned projects)
     */
    public List<Project> searchProjectsByUserId(String keyword, Long userId) {
        List<Project> userProjects = getProjectsByUserId(userId);
        return userProjects.stream()
            .filter(project -> 
                project.getName().toLowerCase().contains(keyword.toLowerCase()) ||
                (project.getDescription() != null && 
                 project.getDescription().toLowerCase().contains(keyword.toLowerCase()))
            )
            .collect(Collectors.toList());
    }
}
