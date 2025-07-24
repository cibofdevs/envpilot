package com.cibofdevs.envpilot.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "notifications")
@Schema(description = "Notification entity")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Notification ID", example = "1")
    private Long id;

    @Schema(description = "Notification title", example = "Project Updated")
    private String title;
    
    @Schema(description = "Notification description", example = "Project 'My Project' has been updated")
    private String description;
    
    @Schema(description = "Notification type", example = "info", allowableValues = {"success", "info", "warning", "error"})
    private String type; // success, info, error, dsb
    
    @Schema(description = "Notification timestamp", example = "15/01/2024 10:30")
    private String time; // bisa string, atau LocalDateTime jika ingin

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Schema(description = "Whether notification has been read", example = "false")
    private Boolean read = false;
}