package com.cibofdevs.envpilot.repository;

import com.cibofdevs.envpilot.model.ProjectAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectAssignmentRepository extends JpaRepository<ProjectAssignment, Long> {
    
    // Find all assignments for a specific project
    List<ProjectAssignment> findByProjectId(Long projectId);
    
    // Find all assignments for a specific user
    List<ProjectAssignment> findByUserId(Long userId);
    
    // Find specific assignment for a project and user
    Optional<ProjectAssignment> findByProjectIdAndUserId(Long projectId, Long userId);
    
    // Check if user is assigned to project
    boolean existsByProjectIdAndUserId(Long projectId, Long userId);
}