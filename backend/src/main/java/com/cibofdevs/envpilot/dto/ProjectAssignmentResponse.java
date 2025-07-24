package com.cibofdevs.envpilot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "Project Assignment Response")
@Data
public class ProjectAssignmentResponse {
    
    @Schema(description = "Assignment ID", example = "1")
    private Long id;
    
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
    
    @Schema(description = "Assignment role", example = "MEMBER")
    private String role;
    
    @Schema(description = "Assignment date")
    private LocalDateTime assignedAt;
    
    @Schema(description = "Admin who assigned the user", example = "Admin User")
    private String assignedBy;
    
    @Schema(description = "Notes about the assignment")
    private String notes;
} 