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
@Table(name = "configurations")
@Schema(description = "Configuration entity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Configuration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Configuration ID", example = "1")
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(name = "config_key")
    @Schema(description = "Configuration key", example = "database_url")
    private String key;

    @Column(name = "config_value", columnDefinition = "TEXT")
    @Schema(description = "Configuration value", example = "jdbc:postgresql://localhost:5432/mydb")
    private String value;

    @Size(max = 255)
    @Schema(description = "Configuration description", example = "Database connection URL")
    private String description;

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