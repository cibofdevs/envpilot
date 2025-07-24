package com.cibofdevs.envpilot.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "project_assignments")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Schema(description = "Project Assignment entity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Assignment ID", example = "1")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AssignmentRole role = AssignmentRole.MEMBER;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "assigned_by")
    private Long assignedBy; // ID of the admin who assigned the user

    @Column(name = "notes")
    private String notes;

    public enum AssignmentRole {
        OWNER, MEMBER, VIEWER
    }

    @PrePersist
    protected void onCreate() {
        assignedAt = LocalDateTime.now();
    }
} 