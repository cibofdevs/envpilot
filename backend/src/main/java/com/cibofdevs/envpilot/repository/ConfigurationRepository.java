package com.cibofdevs.envpilot.repository;

import com.cibofdevs.envpilot.model.Configuration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ConfigurationRepository extends JpaRepository<Configuration, Long> {
    List<Configuration> findByEnvironmentId(Long environmentId);
    
    // Analytics methods
    long countByCreatedAtAfter(LocalDateTime date);
}
