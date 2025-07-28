package com.cibofdevs.envpilot.repository;

import com.cibofdevs.envpilot.model.EnvironmentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnvironmentAssignmentRepository extends JpaRepository<EnvironmentAssignment, Long> {
    
    // Find assignments by environment ID
    List<EnvironmentAssignment> findByEnvironmentId(Long environmentId);
    
    // Find assignments by user ID
    List<EnvironmentAssignment> findByUserId(Long userId);
    
    // Find assignments by project ID (through environment)
    @Query("SELECT ea FROM EnvironmentAssignment ea JOIN ea.environment e WHERE e.project.id = ?1")
    List<EnvironmentAssignment> findByProjectId(Long projectId);
    
    // Find assignments by environment ID and user ID
    Optional<EnvironmentAssignment> findByEnvironmentIdAndUserId(Long environmentId, Long userId);

    // Check if active assignment exists
    boolean existsByEnvironmentIdAndUserIdAndStatus(Long environmentId, Long userId, EnvironmentAssignment.Status status);

    // Find active assignments for a specific environment
    @Query("SELECT ea FROM EnvironmentAssignment ea WHERE ea.environment.id = ?1 AND ea.status = 'ACTIVE'")
    List<EnvironmentAssignment> findActiveAssignmentsByEnvironmentId(Long environmentId);
    
    // Delete all assignments for a specific user
    void deleteByUserId(Long userId);
}