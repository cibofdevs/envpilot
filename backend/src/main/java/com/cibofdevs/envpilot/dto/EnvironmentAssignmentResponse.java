package com.cibofdevs.envpilot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "Environment Assignment Response")
public class EnvironmentAssignmentResponse {
    
    @Schema(description = "Assignment ID", example = "1")
    private Long id;
    
    @Schema(description = "Environment ID", example = "1")
    private Long environmentId;
    
    @Schema(description = "Environment name", example = "development")
    private String environmentName;
    
    @Schema(description = "Project ID", example = "1")
    private Long projectId;
    
    @Schema(description = "Project name", example = "My Project")
    private String projectName;
    
    @Schema(description = "User ID", example = "1")
    private Long userId;
    
    @Schema(description = "User name", example = "John Doe")
    private String userName;
    
    @Schema(description = "User email", example = "john@example.com")
    private String userEmail;
    
    @Schema(description = "Assigned by user ID", example = "1")
    private Long assignedById;
    
    @Schema(description = "Assigned by user name", example = "Admin User")
    private String assignedByName;
    
    @Schema(description = "User role for this environment", example = "DEVELOPER")
    private String role;
    
    @Schema(description = "Assignment timestamp")
    private LocalDateTime assignedAt;
    
    @Schema(description = "Assignment notes", example = "Assigned for development work")
    private String notes;
    
    @Schema(description = "Assignment status", example = "ACTIVE")
    private String status;
} 