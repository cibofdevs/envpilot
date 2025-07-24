package com.cibofdevs.envpilot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "Environment Assignment Request")
public class EnvironmentAssignmentRequest {
    
    @NotNull
    @Schema(description = "List of user IDs to assign", example = "[1, 2, 3]")
    private List<Long> userIds;
    
    @NotNull
    @Schema(description = "Environment ID to assign", example = "1")
    private Long environmentId;
    
    @Schema(description = "Assignment notes", example = "Assigned for development work")
    private String notes;
} 