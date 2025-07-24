package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.dto.ProjectAssignmentRequest;
import com.cibofdevs.envpilot.service.ProjectAssignmentService;
import com.cibofdevs.envpilot.service.UserDetailsServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/project-assignments")
@Tag(name = "Project Assignments", description = "Project assignment management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class ProjectAssignmentController {

    @Autowired
    private ProjectAssignmentService projectAssignmentService;

    /**
     * Assign users to a project
     */
    @PostMapping("/{projectId}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Assign Users to Project",
        description = "Assign multiple users to a specific project with specified roles. Admin access required."
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
            description = "Invalid request or project not found"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - Admin role required"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Project not found"
        )
    })
    public ResponseEntity<Map<String, Object>> assignUsersToProject(
            @Parameter(description = "Project ID", example = "1") @PathVariable Long projectId,
            @RequestBody ProjectAssignmentRequest request,
            Authentication authentication) {

        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        Long adminId = userPrincipal.getId();

        Map<String, Object> result = projectAssignmentService.assignUsersToProject(projectId, request, adminId);

        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Get all assignments for a project
     */
    @GetMapping("/{projectId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get Project Assignments",
        description = "Retrieve all user assignments for a specific project. Admin access required."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Project assignments retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class)
            )
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - Admin role required"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Project not found"
        )
    })
    public ResponseEntity<Map<String, Object>> getProjectAssignments(
            @Parameter(description = "Project ID", example = "1") @PathVariable Long projectId) {

        Map<String, Object> result = projectAssignmentService.getProjectAssignments(projectId);

        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Remove user from project
     */
    @DeleteMapping("/{projectId}/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Remove User from Project",
        description = "Remove a specific user assignment from a project. Admin access required."
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
            responseCode = "400",
            description = "Invalid request or assignment not found"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - Admin role required"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Project or assignment not found"
        )
    })
    public ResponseEntity<Map<String, Object>> removeUserFromProject(
            @Parameter(description = "Project ID", example = "1") @PathVariable Long projectId,
            @Parameter(description = "User ID", example = "1") @PathVariable Long userId) {

        Map<String, Object> result = projectAssignmentService.removeUserFromProject(projectId, userId);

        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Get all projects assigned to current user
     */
    @GetMapping("/my-projects")
    @Operation(
        summary = "Get My Project Assignments",
        description = "Retrieve all projects assigned to the current authenticated user."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "User projects retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class)
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Unauthorized - Authentication required"
        )
    })
    public ResponseEntity<Map<String, Object>> getMyProjects(Authentication authentication) {

        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();

        Map<String, Object> result = projectAssignmentService.getUserProjects(userId);

        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    /**
     * Check if current user has access to a project
     */
    @GetMapping("/{projectId}/access")
    @Operation(
        summary = "Check Project Access",
        description = "Check if the current authenticated user has access to a specific project."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Access check completed",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class)
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Unauthorized - Authentication required"
        )
    })
    public ResponseEntity<Map<String, Object>> checkProjectAccess(
            @Parameter(description = "Project ID", example = "1") @PathVariable Long projectId,
            Authentication authentication) {

        UserDetailsServiceImpl.UserPrincipal userPrincipal = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();

        boolean hasAccess = projectAssignmentService.hasProjectAccess(userId, projectId);
        var role = projectAssignmentService.getUserProjectRole(userId, projectId);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("hasAccess", hasAccess);
        result.put("role", role.map(Enum::toString).orElse(null));

        return ResponseEntity.ok(result);
    }
} 