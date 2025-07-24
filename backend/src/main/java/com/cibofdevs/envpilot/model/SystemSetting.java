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
@Table(name = "system_settings")
@Schema(description = "System setting entity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "System setting ID", example = "1")
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(name = "setting_key", unique = true)
    @Schema(description = "Setting key", example = "app_name")
    private String key;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    @Schema(description = "Setting value", example = "EnvPilot")
    private String value;

    @Size(max = 255)
    @Schema(description = "Setting description", example = "Application name")
    private String description;

    @Size(max = 50)
    @Column(name = "setting_type")
    @Schema(description = "Setting type", example = "STRING", allowableValues = {"STRING", "BOOLEAN", "INTEGER", "JSON"})
    private String type; // STRING, BOOLEAN, INTEGER, JSON

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