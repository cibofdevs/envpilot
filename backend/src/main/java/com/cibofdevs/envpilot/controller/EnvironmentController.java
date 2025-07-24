package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.model.Configuration;
import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.model.FeatureFlag;
import com.cibofdevs.envpilot.repository.ConfigurationRepository;
import com.cibofdevs.envpilot.repository.FeatureFlagRepository;
import com.cibofdevs.envpilot.service.EnvironmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/environments")
@Tag(name = "Environments", description = "Environment management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class EnvironmentController {
    @Autowired
    private EnvironmentService environmentService;

    @Autowired
    private FeatureFlagRepository featureFlagRepository;

    @Autowired
    private ConfigurationRepository configurationRepository;

    @GetMapping("/{id}")
    @Operation(
        summary = "Get Environment by ID",
        description = "Retrieve a specific environment by its ID."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Environment found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Environment.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Environment not found"
        )
    })
    public ResponseEntity<Environment> getEnvironmentById(@PathVariable Long id) {
        Optional<Environment> environment = environmentService.getEnvironmentById(id);
        return environment.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DEVELOPER')")
    public ResponseEntity<Environment> updateEnvironment(@PathVariable Long id, @Valid @RequestBody Environment environmentDetails) {
        Optional<Environment> environmentOpt = environmentService.getEnvironmentById(id);
        if (environmentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Environment environment = environmentOpt.get();
        environment.setName(environmentDetails.getName());
        environment.setDeploymentUrl(environmentDetails.getDeploymentUrl());
        if (environmentDetails.getStatus() != null) {
            environment.setStatus(environmentDetails.getStatus());
        }

        return ResponseEntity.ok(environmentService.updateEnvironment(environment));
    }

    @GetMapping("/{id}/feature-flags")
    public ResponseEntity<List<FeatureFlag>> getEnvironmentFeatureFlags(@PathVariable Long id) {
        return ResponseEntity.ok(featureFlagRepository.findByEnvironmentId(id));
    }

    @PostMapping("/{id}/feature-flags")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DEVELOPER')")
    public ResponseEntity<FeatureFlag> createFeatureFlag(@PathVariable Long id, @Valid @RequestBody FeatureFlag featureFlag) {
        Optional<Environment> environmentOpt = environmentService.getEnvironmentById(id);
        if (environmentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        featureFlag.setEnvironment(environmentOpt.get());
        return ResponseEntity.ok(featureFlagRepository.save(featureFlag));
    }

    @PutMapping("/{id}/feature-flags/{flagId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DEVELOPER')")
    public ResponseEntity<FeatureFlag> updateFeatureFlag(@PathVariable Long id, @PathVariable Long flagId, @Valid @RequestBody FeatureFlag flagDetails) {
        Optional<FeatureFlag> flagOpt = featureFlagRepository.findById(flagId);
        if (flagOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        FeatureFlag flag = flagOpt.get();
        flag.setKey(flagDetails.getKey());
        flag.setDescription(flagDetails.getDescription());
        flag.setEnabled(flagDetails.getEnabled());

        return ResponseEntity.ok(featureFlagRepository.save(flag));
    }

    @DeleteMapping("/{id}/feature-flags/{flagId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteFeatureFlag(@PathVariable Long id, @PathVariable Long flagId) {
        if (!featureFlagRepository.existsById(flagId)) {
            return ResponseEntity.notFound().build();
        }

        featureFlagRepository.deleteById(flagId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Feature flag deleted successfully!");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/configurations")
    public ResponseEntity<List<Configuration>> getEnvironmentConfigurations(@PathVariable Long id) {
        return ResponseEntity.ok(configurationRepository.findByEnvironmentId(id));
    }

    @PostMapping("/{id}/configurations")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DEVELOPER')")
    public ResponseEntity<Configuration> createConfiguration(@PathVariable Long id, @Valid @RequestBody Configuration configuration) {
        Optional<Environment> environmentOpt = environmentService.getEnvironmentById(id);
        if (environmentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        configuration.setEnvironment(environmentOpt.get());
        return ResponseEntity.ok(configurationRepository.save(configuration));
    }

    @PutMapping("/{id}/configurations/{configId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DEVELOPER')")
    public ResponseEntity<Configuration> updateConfiguration(@PathVariable Long id, @PathVariable Long configId, @Valid @RequestBody Configuration configDetails) {
        Optional<Configuration> configOpt = configurationRepository.findById(configId);
        if (configOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Configuration config = configOpt.get();
        config.setKey(configDetails.getKey());
        config.setValue(configDetails.getValue());
        config.setDescription(configDetails.getDescription());

        return ResponseEntity.ok(configurationRepository.save(config));
    }

    @DeleteMapping("/{id}/configurations/{configId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteConfiguration(@PathVariable Long id, @PathVariable Long configId) {
        if (!configurationRepository.existsById(configId)) {
            return ResponseEntity.notFound().build();
        }

        configurationRepository.deleteById(configId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Configuration deleted successfully!");
        return ResponseEntity.ok(response);
    }
}
