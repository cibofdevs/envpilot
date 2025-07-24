package com.cibofdevs.envpilot.repository;

import com.cibofdevs.envpilot.model.Environment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnvironmentRepository extends JpaRepository<Environment, Long> {
    List<Environment> findByProjectId(Long projectId);
    List<Environment> findByStatus(Environment.Status status);
    
    // Analytics methods
    @Query("SELECT p.name, COUNT(e) FROM Environment e JOIN e.project p GROUP BY p.name")
    List<Object[]> findEnvironmentCountByProject();
    
    // Environment assignment methods
    @Query("SELECT DISTINCT e FROM Environment e JOIN e.assignments a WHERE a.user.id = ?1 AND e.status = 'ONLINE' AND a.status = 'ACTIVE'")
    List<Environment> findActiveEnvironmentsByUserId(Long userId);
    
    // Alternative query for debugging
    @Query("SELECT DISTINCT e FROM Environment e JOIN e.assignments a WHERE a.user.id = ?1 AND a.status = 'ACTIVE'")
    List<Environment> findEnvironmentsByUserId(Long userId);
}
