package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.dto.EnvironmentAssignmentRequest;
import com.cibofdevs.envpilot.dto.EnvironmentAssignmentResponse;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.cibofdevs.envpilot.service.EnvironmentAssignmentService;
import com.cibofdevs.envpilot.service.UserDetailsServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/environment-assignments")
@Tag(name = "Environment Assignments", description = "Environment assignment management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class EnvironmentAssignmentController {
    
    @Autowired
    private EnvironmentAssignmentService environmentAssignmentService;
    
    @Autowired
    private UserRepository userRepository;
    
    @PostMapping("/assign")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Assign Users to Environment",
        description = "Assign multiple users to a specific environment with role and notes."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Users assigned successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid request data"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - Admin role required"
        )
    })
    public ResponseEntity<Map<String, Object>> assignUsersToEnvironment(
            @RequestBody EnvironmentAssignmentRequest request,
            Authentication authentication) {
        
        Map<String, Object> response = new HashMap<>();
        
        // Get current admin user
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        Optional<User> adminUserOpt = userRepository.findByEmail(userPrincipal.getUsername());
        
        if (adminUserOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Admin user not found");
            return ResponseEntity.badRequest().body(response);
        }
        
        User adminUser = adminUserOpt.get();
        
        // Validate request
        if (request.getUserIds() == null || request.getUserIds().isEmpty()) {
            response.put("success", false);
            response.put("message", "User IDs are required");
            return ResponseEntity.badRequest().body(response);
        }
        
        if (request.getEnvironmentId() == null) {
            response.put("success", false);
            response.put("message", "Environment ID is required");
            return ResponseEntity.badRequest().body(response);
        }
        
        // Process assignment
        boolean success = environmentAssignmentService.assignUsersToEnvironment(request, adminUser);
        
        if (success) {
            response.put("success", true);
            response.put("message", "Users assigned to environment successfully");
        } else {
            response.put("success", false);
            response.put("message", "Failed to assign users to environment");
        }
        
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{environmentId}/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Remove User from Environment",
        description = "Remove a specific user from environment assignment."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "User removed successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Assignment not found"
        )
    })
    public ResponseEntity<Map<String, Object>> removeUserFromEnvironment(
            @PathVariable Long environmentId,
            @PathVariable Long userId,
            Authentication authentication) {
        
        Map<String, Object> response = new HashMap<>();
        
        // Get current admin user
        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        Optional<User> adminUserOpt = userRepository.findByEmail(userPrincipal.getUsername());
        
        if (adminUserOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Admin user not found");
            return ResponseEntity.badRequest().body(response);
        }
        
        User adminUser = adminUserOpt.get();
        
        // Process removal
        boolean success = environmentAssignmentService.removeUserFromEnvironment(environmentId, userId, adminUser);
        
        if (success) {
            response.put("success", true);
            response.put("message", "User removed from environment successfully");
        } else {
            response.put("success", false);
            response.put("message", "Assignment not found or failed to remove");
        }
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/environment/{environmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get Environment Assignments",
        description = "Get all assignments for a specific environment."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Assignments retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = EnvironmentAssignmentResponse.class)
            )
        )
    })
    public ResponseEntity<List<EnvironmentAssignmentResponse>> getEnvironmentAssignments(@PathVariable Long environmentId) {
        List<EnvironmentAssignmentResponse> assignments = environmentAssignmentService.getEnvironmentAssignments(environmentId);
        return ResponseEntity.ok(assignments);
    }
    
    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'QA')")
    @Operation(
        summary = "Get Project Environment Assignments",
        description = "Get all environment assignments for a specific project."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Assignments retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = EnvironmentAssignmentResponse.class)
            )
        )
    })
    public ResponseEntity<List<EnvironmentAssignmentResponse>> getProjectEnvironmentAssignments(@PathVariable Long projectId) {
        List<EnvironmentAssignmentResponse> assignments = environmentAssignmentService.getProjectEnvironmentAssignments(projectId);
        return ResponseEntity.ok(assignments);
    }
    
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'QA')")
    @Operation(
        summary = "Get User Environment Assignments",
        description = "Get all environment assignments for a specific user."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Assignments retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = EnvironmentAssignmentResponse.class)
            )
        )
    })
    public ResponseEntity<List<EnvironmentAssignmentResponse>> getUserEnvironmentAssignments(@PathVariable Long userId) {
        List<EnvironmentAssignmentResponse> assignments = environmentAssignmentService.getUserEnvironmentAssignments(userId);
        return ResponseEntity.ok(assignments);
    }
    
    @GetMapping("/{environmentId}/access/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'QA')")
    @Operation(
        summary = "Check User Environment Access",
        description = "Check if a user has access to a specific environment."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Access check completed",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class)
            )
        )
    })
    public ResponseEntity<Map<String, Object>> checkUserEnvironmentAccess(
            @PathVariable Long environmentId,
            @PathVariable Long userId) {
        
        Map<String, Object> response = new HashMap<>();
        boolean hasAccess = environmentAssignmentService.hasUserAccessToEnvironment(userId, environmentId);
        
        response.put("hasAccess", hasAccess);
        response.put("environmentId", environmentId);
        response.put("userId", userId);
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/environment/{environmentId}/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'DEVELOPER', 'QA')")
    @Operation(
        summary = "Get Active Environment Assignments",
        description = "Get all active assignments for a specific environment."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Active assignments retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = EnvironmentAssignmentResponse.class)
            )
        )
    })
    public ResponseEntity<List<EnvironmentAssignmentResponse>> getActiveEnvironmentAssignments(@PathVariable Long environmentId) {
        List<EnvironmentAssignmentResponse> assignments = environmentAssignmentService.getActiveEnvironmentAssignments(environmentId);
        return ResponseEntity.ok(assignments);
    }
} 