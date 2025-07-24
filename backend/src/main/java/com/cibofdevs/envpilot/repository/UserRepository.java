package com.cibofdevs.envpilot.repository;

import com.cibofdevs.envpilot.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    
    // User management methods
    Page<User> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email, Pageable pageable);
    Page<User> findByRole(User.Role role, Pageable pageable);
    Page<User> findByNameContainingIgnoreCaseAndRole(String name, User.Role role, Pageable pageable);
    long countByRole(User.Role role);
    long countByLastLoginAfter(LocalDateTime date);

    List<User> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    long countByCreatedAtAfter(LocalDateTime date);
}
