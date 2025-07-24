package com.cibofdevs.envpilot.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "feature_flags")
@Schema(description = "Feature flag entity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeatureFlag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Feature flag ID", example = "1")
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(name = "flag_key")
    @Schema(description = "Feature flag key", example = "new_ui_enabled")
    private String key;

    @Size(max = 255)
    @Schema(description = "Feature flag description", example = "Enable new user interface")
    private String description;

    @Column(name = "is_enabled")
    @Schema(description = "Feature flag enabled status", example = "true")
    private Boolean enabled = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "environment_id")
    private Environment environment;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;



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