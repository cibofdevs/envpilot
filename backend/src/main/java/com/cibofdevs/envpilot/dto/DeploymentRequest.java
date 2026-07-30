package com.cibofdevs.envpilot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;

@Schema(description = "Deployment request data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentRequest {
    @Schema(description = "Version to deploy, for EnvPilot's own deployment history (optional - not required by every Jenkins job)", example = "1.0.0")
    private String version;

    @Schema(description = "Deployment notes", example = "Initial deployment")
    private String notes;

    @Schema(description = "Environment name", example = "production")
    private String envName;

    @Schema(description = "Git branch/ref to deploy, required only if the Jenkins job has a Git Parameter branch field", example = "origin/v1.3.70.UAT")
    private String branch;

    @Schema(description = "Dynamic Jenkins job parameters keyed by the parameter name the job itself declares (String/Text/Boolean/Choice/Password), discovered via GET /api/jenkins/parameters/{projectId}")
    private Map<String, String> jenkinsParameters;
}