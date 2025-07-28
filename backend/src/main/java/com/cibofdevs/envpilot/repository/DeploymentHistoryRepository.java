package com.cibofdevs.envpilot.repository;

import com.cibofdevs.envpilot.model.DeploymentHistory;
import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeploymentHistoryRepository extends JpaRepository<DeploymentHistory, Long> {
    List<DeploymentHistory> findByProject(Project project);
    List<DeploymentHistory> findByEnvironment(Environment environment);
    List<DeploymentHistory> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    
    // Analytics methods
    List<DeploymentHistory> findByCreatedAtAfter(LocalDateTime date);
    List<DeploymentHistory> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    long countByCreatedAtAfter(LocalDateTime date);
    
    @Query("SELECT p.name, COUNT(dh) FROM DeploymentHistory dh JOIN dh.project p GROUP BY p.name ORDER BY COUNT(dh) DESC")
    List<Object[]> findMostActiveProjects(int limit);

    // Find deployments by user who triggered them
    List<DeploymentHistory> findByTriggeredById(Long userId);
    
    // Delete deployments by user who triggered them
    void deleteByTriggeredById(Long userId);
    
    // Find deployments by status
    List<DeploymentHistory> findByStatusIn(List<DeploymentHistory.Status> statuses);
    
    // Jenkins integration methods
    List<DeploymentHistory> findByProjectAndJenkinsBuildNumber(Project project, Integer jenkinsBuildNumber);
    
    // Real-time sync methods
    List<DeploymentHistory> findByStatusInAndCreatedAtAfter(List<DeploymentHistory.Status> statuses, LocalDateTime after);
    
    // EAGER loading methods to avoid LazyInitializationException
    @Query("SELECT dh FROM DeploymentHistory dh " +
           "JOIN FETCH dh.project " +
           "JOIN FETCH dh.environment " +
           "JOIN FETCH dh.triggeredBy " +
           "WHERE dh.status IN :statuses")
    List<DeploymentHistory> findByStatusInWithEagerLoading(List<DeploymentHistory.Status> statuses);
    
    @Query("SELECT dh FROM DeploymentHistory dh " +
           "JOIN FETCH dh.project " +
           "JOIN FETCH dh.environment " +
           "JOIN FETCH dh.triggeredBy " +
           "WHERE dh.status IN :statuses AND dh.createdAt > :after")
    List<DeploymentHistory> findByStatusInAndCreatedAtAfterWithEagerLoading(List<DeploymentHistory.Status> statuses, LocalDateTime after);
    
    @Query("SELECT dh FROM DeploymentHistory dh " +
           "JOIN FETCH dh.project " +
           "JOIN FETCH dh.environment " +
           "JOIN FETCH dh.triggeredBy " +
           "WHERE dh.id = :deploymentId")
    Optional<DeploymentHistory> findByIdWithEagerLoading(Long deploymentId);
}
