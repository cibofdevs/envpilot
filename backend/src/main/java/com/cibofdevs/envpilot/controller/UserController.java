package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.cibofdevs.envpilot.dto.UserCreateRequest;
import com.cibofdevs.envpilot.dto.UserUpdateRequest;
import com.cibofdevs.envpilot.service.NotificationService;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Users", description = "User management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private FeatureFlagService featureFlagService;

    private static final String PROFILE_PHOTO_DIR = "uploads/profile-photos";

    @GetMapping
    @Operation(
        summary = "Get All Users",
        description = "Retrieve paginated list of users with optional filtering and sorting."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Users retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Users Response",
                        value = "{\"users\": [{\"id\": 1, \"name\": \"Admin User\", \"email\": \"admin@envpilot.com\", \"role\": \"ADMIN\"}], \"currentPage\": 0, \"totalItems\": 1, \"totalPages\": 1, \"hasNext\": false, \"hasPrevious\": false}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Access denied - Admin role required"
        )
    })
    public ResponseEntity<Map<String, Object>> getAllUsers(
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Sort field", example = "createdAt") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction", example = "desc") @RequestParam(defaultValue = "desc") String sortDir,
            @Parameter(description = "Search term for name or email") @RequestParam(required = false) String search,
            @Parameter(description = "Filter by role", example = "ADMIN") @RequestParam(required = false) String role) {

        Sort sort = sortDir.equalsIgnoreCase("desc") ? 
            Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<User> users;

        if (search != null && !search.trim().isEmpty()) {
            if (role != null && !role.trim().isEmpty()) {
                users = userRepository.findByNameContainingIgnoreCaseAndRole(search, User.Role.valueOf(role.toUpperCase()), pageable);
            } else {
                users = userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(search, search, pageable);
            }
        } else if (role != null && !role.trim().isEmpty()) {
            users = userRepository.findByRole(User.Role.valueOf(role.toUpperCase()), pageable);
        } else {
            users = userRepository.findAll(pageable);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("users", users.getContent());
        response.put("currentPage", users.getNumber());
        response.put("totalItems", users.getTotalElements());
        response.put("totalPages", users.getTotalPages());
        response.put("hasNext", users.hasNext());
        response.put("hasPrevious", users.hasPrevious());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(
        summary = "Get User by ID",
        description = "Retrieve a specific user by their ID."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "User found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = User.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "User not found"
        )
    })
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        Optional<User> user = userRepository.findById(id);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    @Operation(
        summary = "Create User",
        description = "Create a new user account. Admin access required."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "User created successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = User.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid user data or email already exists"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "User registration disabled or access denied"
        )
    })
    public ResponseEntity<User> createUser(@RequestBody UserCreateRequest request, Authentication authentication) {
        // Cek feature flag user registration
        if (!featureFlagService.isUserRegistrationEnabled()) {
            return ResponseEntity.status(403).build();
        }
        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.valueOf(request.getRole().toUpperCase()));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        User savedUser = userRepository.save(user);
        
        // Create bell notification for successful user creation
        try {
            // Get current admin user who created the new user
            String adminEmail = authentication.getName();
            Optional<User> adminUser = userRepository.findByEmail(adminEmail);
            
            if (adminUser.isPresent()) {
                notificationService.createNotification(
                    adminUser.get(),
                    "User Berhasil Dibuat",
                    String.format("User '%s' dengan email %s dan role %s berhasil dibuat", 
                        savedUser.getName(), savedUser.getEmail(), savedUser.getRole().name()),
                    "success"
                );
                
                System.out.println("🔔 Bell notification created for user creation");
                System.out.println("   Created by: " + adminUser.get().getName());
                System.out.println("   New user: " + savedUser.getName() + " (" + savedUser.getEmail() + ")");
                System.out.println("   Role: " + savedUser.getRole().name());
                // Audit logging
                if (featureFlagService.isAuditLoggingEnabled()) {
                    System.out.println("📋 AUDIT LOG: User created");
                    System.out.println("   Admin: " + adminUser.get().getName() + " (" + adminUser.get().getEmail() + ")");
                    System.out.println("   New User: " + savedUser.getName() + " (" + savedUser.getEmail() + ")");
                    System.out.println("   Role: " + savedUser.getRole().name());
                    System.out.println("   Timestamp: " + LocalDateTime.now());
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to create user creation notification: " + e.getMessage());
            // Don't crash the application if notification creation fails
        }
        
        return ResponseEntity.ok(savedUser);
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody UserUpdateRequest request, Authentication authentication) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (!optionalUser.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        User user = optionalUser.get();
        String originalName = user.getName();
        String originalEmail = user.getEmail();
        User.Role originalRole = user.getRole();
        
        if (request.getName() != null) {
            user.setName(request.getName());
        }
        
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            // Check if new email already exists
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().build();
            }
            user.setEmail(request.getEmail());
        }
        
        if (request.getRole() != null) {
            user.setRole(User.Role.valueOf(request.getRole().toUpperCase()));
        }
        
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        
        user.setUpdatedAt(LocalDateTime.now());
        User updatedUser = userRepository.save(user);
        
        // Create bell notification for successful user update
        try {
            String adminEmail = authentication.getName();
            Optional<User> adminUser = userRepository.findByEmail(adminEmail);
            
            if (adminUser.isPresent()) {
                String changes = "";
                if (!originalName.equals(updatedUser.getName())) {
                    changes += "Nama: " + originalName + " → " + updatedUser.getName() + ", ";
                }
                if (!originalEmail.equals(updatedUser.getEmail())) {
                    changes += "Email: " + originalEmail + " → " + updatedUser.getEmail() + ", ";
                }
                if (originalRole != updatedUser.getRole()) {
                    changes += "Role: " + originalRole.name() + " → " + updatedUser.getRole().name() + ", ";
                }
                if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
                    changes += "Password: Diperbarui, ";
                }
                
                if (!changes.isEmpty()) {
                    changes = changes.substring(0, changes.length() - 2); // Remove last ", "
                    notificationService.createNotification(
                        adminUser.get(),
                        "User Berhasil Diperbarui",
                        String.format("User '%s' berhasil diperbarui. Perubahan: %s", updatedUser.getName(), changes),
                        "info"
                    );
                    
                    System.out.println("🔔 Bell notification created for user update");
                    System.out.println("   Updated by: " + adminUser.get().getName());
                    System.out.println("   User: " + updatedUser.getName() + " (" + updatedUser.getEmail() + ")");
                    System.out.println("   Changes: " + changes);
                    // Audit logging
                    if (featureFlagService.isAuditLoggingEnabled()) {
                        System.out.println("📋 AUDIT LOG: User updated");
                        System.out.println("   Admin: " + adminUser.get().getName() + " (" + adminUser.get().getEmail() + ")");
                        System.out.println("   Updated User: " + updatedUser.getName() + " (" + updatedUser.getEmail() + ")");
                        System.out.println("   Changes: " + changes);
                        System.out.println("   Timestamp: " + LocalDateTime.now());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to create user update notification: " + e.getMessage());
            // Don't crash the application if notification creation fails
        }
        
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, Authentication authentication) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        // Get user info before deletion for notification
        Optional<User> userToDelete = userRepository.findById(id);
        String userName = "";
        String userEmail = "";
        User.Role userRole = null;
        
        if (userToDelete.isPresent()) {
            userName = userToDelete.get().getName();
            userEmail = userToDelete.get().getEmail();
            userRole = userToDelete.get().getRole();
        }
        
        userRepository.deleteById(id);
        
        // Create bell notification for successful user deletion
        try {
            String adminEmail = authentication.getName();
            Optional<User> adminUser = userRepository.findByEmail(adminEmail);
            
            if (adminUser.isPresent() && !userName.isEmpty()) {
                notificationService.createNotification(
                    adminUser.get(),
                    "User Berhasil Dihapus",
                    String.format("User '%s' dengan email %s dan role %s berhasil dihapus", 
                        userName, userEmail, userRole != null ? userRole.name() : "Unknown"),
                    "warning"
                );
                
                System.out.println("🔔 Bell notification created for user deletion");
                System.out.println("   Deleted by: " + adminUser.get().getName());
                System.out.println("   Deleted user: " + userName + " (" + userEmail + ")");
                System.out.println("   Role: " + (userRole != null ? userRole.name() : "Unknown"));
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to create user deletion notification: " + e.getMessage());
            // Don't crash the application if notification creation fails
        }
        
        // Audit logging for user deletion
        if (featureFlagService.isAuditLoggingEnabled()) {
            String adminEmail = authentication.getName();
            Optional<User> adminUser = userRepository.findByEmail(adminEmail);
            if (adminUser.isPresent()) {
                System.out.println("📋 AUDIT LOG: User deleted");
                System.out.println("   Admin: " + adminUser.get().getName() + " (" + adminUser.get().getEmail() + ")");
                System.out.println("   Deleted User: " + userName + " (" + userEmail + ")");
                System.out.println("   Role: " + (userRole != null ? userRole.name() : ""));
                System.out.println("   Timestamp: " + LocalDateTime.now());
            }
        }
        
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/roles")
    public ResponseEntity<List<String>> getAllRoles() {
        List<String> roles = Arrays.stream(User.Role.values())
            .map(Enum::name)
            .toList();
        return ResponseEntity.ok(roles);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getUserStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long totalUsers = userRepository.count();
        stats.put("totalUsers", totalUsers);
        
        // Role distribution
        Map<String, Long> roleDistribution = new HashMap<>();
        for (User.Role role : User.Role.values()) {
            long count = userRepository.countByRole(role);
            roleDistribution.put(role.name().toLowerCase(), count);
        }
        stats.put("roleDistribution", roleDistribution);
        
        // Recent registrations (last 30 days)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long recentRegistrations = userRepository.countByCreatedAtAfter(thirtyDaysAgo);
        stats.put("recentRegistrations", recentRegistrations);
        
        // Active users (users with recent login)
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        long activeUsers = userRepository.countByLastLoginAfter(sevenDaysAgo);
        stats.put("activeUsers", activeUsers);
        
        return ResponseEntity.ok(stats);
    }

    @PutMapping("/{id}/toggle-status")
    public ResponseEntity<User> toggleUserStatus(@PathVariable Long id) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (!optionalUser.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        User user = optionalUser.get();
        // Note: We would need to add an 'active' field to User model for this to work
        // For now, this is a placeholder for future implementation
        user.setUpdatedAt(LocalDateTime.now());
        User updatedUser = userRepository.save(user);
        
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/profile-photo")
    public ResponseEntity<?> uploadProfilePhoto(@RequestParam("file") MultipartFile file, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).body("User not found");
        try {
            Files.createDirectories(Paths.get(PROFILE_PHOTO_DIR));
            String filename = "user-" + user.getId() + "-" + System.currentTimeMillis() + "-" + StringUtils.cleanPath(file.getOriginalFilename());
            Path targetPath = Paths.get(PROFILE_PHOTO_DIR).resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            user.setProfilePhoto("/static/profile-photos/" + filename);
            userRepository.save(user);
            return ResponseEntity.ok().body(user.getProfilePhoto());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to upload profile photo");
        }
    }

    @GetMapping("/profile-photo")
    public ResponseEntity<?> getProfilePhoto(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null || user.getProfilePhoto() == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().body(user.getProfilePhoto());
    }
}
