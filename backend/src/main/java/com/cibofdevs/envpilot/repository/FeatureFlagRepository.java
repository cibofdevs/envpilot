package com.cibofdevs.envpilot.repository;

import com.cibofdevs.envpilot.model.FeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, Long> {
    List<FeatureFlag> findByEnvironmentId(Long environmentId);
    
    // Analytics methods
    long countByEnabled(boolean enabled);
}
