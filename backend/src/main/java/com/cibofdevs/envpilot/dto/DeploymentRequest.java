package com.cibofdevs.envpilot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "Deployment request data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentRequest {
    @NotBlank
    @Schema(description = "Version to deploy", example = "1.0.0")
    private String version;
    
    @Schema(description = "Deployment notes", example = "Initial deployment")
    private String notes;

    @Schema(description = "Environment name", example = "production")
    private String envName;
}