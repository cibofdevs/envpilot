package com.cibofdevs.envpilot.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "environment_assignments")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Schema(description = "Environment Assignment entity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnvironmentAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Environment Assignment ID", example = "1")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "environment_id", nullable = false)
    @Schema(description = "Assigned environment")
    private Environment environment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Schema(description = "Assigned user")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by", nullable = false)
    @Schema(description = "Admin who assigned the environment")
    private User assignedBy;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Schema(description = "User role for this environment", example = "DEVELOPER")
    private User.Role role = User.Role.DEVELOPER;

    @Column(name = "assigned_at")
    @Schema(description = "Assignment timestamp")
    private LocalDateTime assignedAt;

    @Column(name = "notes", length = 500)
    @Schema(description = "Assignment notes", example = "Assigned for development work")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Schema(description = "Assignment status", example = "ACTIVE")
    private Status status = Status.ACTIVE;

    public enum Status {
        ACTIVE, INACTIVE, REVOKED
    }

    @PrePersist
    protected void onCreate() {
        assignedAt = LocalDateTime.now();
    }
} 