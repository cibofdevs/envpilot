package com.cibofdevs.envpilot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Schema(description = "Project Assignment Request")
@Data
public class ProjectAssignmentRequest {
    
    @NotNull
    @Schema(description = "List of user IDs to assign to the project", example = "[1, 2, 3]")
    private List<Long> userIds;
    
    @Schema(description = "Role for the assignment", example = "MEMBER", allowableValues = {"OWNER", "MEMBER", "VIEWER"})
    private String role = "MEMBER";
    
    @Schema(description = "Notes about the assignment", example = "Assigned for development work")
    private String notes;
} 