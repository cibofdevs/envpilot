package com.cibofdevs.envpilot.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "environments")
@Schema(description = "Environment entity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Environment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Environment ID", example = "1")
    private Long id;

    @NotBlank
    @Size(max = 50)
    @Schema(description = "Environment name", example = "production")
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Schema(description = "Environment status", example = "ONLINE", allowableValues = {"ONLINE", "OFFLINE", "DEPLOYING", "ERROR"})
    private Status status = Status.OFFLINE;

    @Size(max = 50)
    @Schema(description = "Current version deployed", example = "1.0.0")
    private String version;

    @Column(name = "deployment_url")
    @Schema(description = "Deployment URL", example = "https://app.example.com")
    private String deploymentUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_deployed_at")
    private LocalDateTime lastDeployedAt;

    @OneToMany(mappedBy = "environment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<FeatureFlag> featureFlags;

    @OneToMany(mappedBy = "environment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Configuration> configurations;

    @OneToMany(mappedBy = "environment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<DeploymentHistory> deploymentHistories;

    @OneToMany(mappedBy = "environment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<EnvironmentAssignment> assignments;

    public enum Status {
        ONLINE, OFFLINE, DEPLOYING, ERROR
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}