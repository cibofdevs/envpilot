package com.cibofdevs.envpilot.repository;

import com.cibofdevs.envpilot.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByStatus(Project.Status status);
    
    @Query("SELECT p FROM Project p WHERE p.name LIKE %?1% OR p.description LIKE %?1%")
    List<Project> findByNameOrDescriptionContaining(String keyword);
    
    // Analytics methods
    List<Project> findByCreatedAtAfter(LocalDateTime date);
    List<Project> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    long countByCreatedAtAfter(LocalDateTime date);
    
    // Project assignment methods
    @Query("SELECT DISTINCT p FROM Project p JOIN p.assignments a WHERE a.user.id = ?1")
    List<Project> findProjectsByUserId(Long userId);
    
    // Jenkins integration methods
    Optional<Project> findByJenkinsJobName(String jenkinsJobName);
}
