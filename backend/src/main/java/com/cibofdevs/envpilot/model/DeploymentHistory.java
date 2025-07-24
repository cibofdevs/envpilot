package com.cibofdevs.envpilot.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "deployment_history")
@Schema(description = "Deployment history entity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Deployment history ID", example = "1")
    private Long id;

    @Size(max = 50)
    @Schema(description = "Deployed version", example = "1.0.0")
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Schema(description = "Deployment status", example = "SUCCESS", allowableValues = {"PENDING", "IN_PROGRESS", "SUCCESS", "FAILED", "CANCELLED"})
    private Status status = Status.PENDING;

    @Size(max = 500)
    @Schema(description = "Deployment notes", example = "Initial deployment")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "environment_id")
    private Environment environment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "triggered_by")
    private User triggeredBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "jenkins_build_number")
    @Schema(description = "Jenkins build number", example = "123")
    private Integer jenkinsBuildNumber;

    @Column(name = "jenkins_build_url")
    @Size(max = 500)
    @Schema(description = "Jenkins build URL", example = "http://jenkins.example.com/job/project/123/")
    private String jenkinsBuildUrl;

    public enum Status {
        PENDING, IN_PROGRESS, SUCCESS, FAILED, CANCELLED
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}