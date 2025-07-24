package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.config.JwtUtils;
import com.cibofdevs.envpilot.dto.JwtResponse;
import com.cibofdevs.envpilot.dto.LoginRequest;
import com.cibofdevs.envpilot.dto.MfaRequest;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.UserRepository;
import com.cibofdevs.envpilot.service.FeatureFlagService;
import com.cibofdevs.envpilot.service.MfaService;
import com.cibofdevs.envpilot.service.TokenBlacklistService;
import com.cibofdevs.envpilot.service.UserDetailsServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Authentication management APIs")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    TokenBlacklistService tokenBlacklistService;

    @Autowired
    private FeatureFlagService featureFlagService;

    @Autowired
    private MfaService mfaService;

    @PostMapping("/signin")
    @Operation(
        summary = "User Authentication",
        description = "Authenticate user with email and password. Returns JWT token or MFA requirements.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Login credentials",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = LoginRequest.class),
                examples = {
                    @ExampleObject(
                        name = "Standard Login",
                        value = "{\"email\": \"admin@envpilot.com\", \"password\": \"admin123\"}"
                    )
                }
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Authentication successful",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = JwtResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "200",
            description = "MFA verification required",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "MFA Required",
                        value = "{\"requiresMfa\": true, \"tempToken\": \"jwt_token\", \"message\": \"MFA verification required.\"}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "200",
            description = "MFA setup required",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "MFA Setup Required",
                        value = "{\"requiresMfaSetup\": true, \"tempToken\": \"jwt_token\", \"message\": \"MFA setup required.\"}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Authentication failed",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Email Not Found",
                        value = "{\"message\": \"Email not found. Please check your email address.\"}"
                    ),
                    @ExampleObject(
                        name = "Incorrect Password",
                        value = "{\"message\": \"Incorrect password. Please check your password.\"}"
                    )
                }
            )
        )
    })
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        System.out.println("Login attempt for email: " + loginRequest.getEmail());
        
        try {
            // Check if user exists first
            User user = userRepository.findByEmail(loginRequest.getEmail()).orElse(null);
            if (user == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Email not found. Please check your email address.");
                return ResponseEntity.status(401).body(response);
            }
            
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            UserDetailsServiceImpl.UserPrincipal userDetails = (UserDetailsServiceImpl.UserPrincipal) authentication.getPrincipal();
            System.out.println("Authentication successful for user: " + userDetails.getUsername());
            
            // Check if MFA is enabled
            if (mfaService.isMfaEnabled(loginRequest.getEmail())) {
                // MFA is enabled, return temporary token and require MFA verification
                Map<String, Object> response = new HashMap<>();
                response.put("requiresMfa", true);
                response.put("tempToken", jwt);
                response.put("message", "MFA verification required.");
                return ResponseEntity.status(200).body(response);
            }
            
            // Check if MFA setup is not completed
            if (!mfaService.isMfaSetupCompleted(loginRequest.getEmail())) {
                // MFA setup not completed, return setup required response
                Map<String, Object> response = new HashMap<>();
                response.put("requiresMfaSetup", true);
                response.put("tempToken", jwt);
                response.put("message", "MFA setup required.");
                return ResponseEntity.status(200).body(response);
            }
            
            // Update last login
            if (user != null) {
                user.setLastLogin(LocalDateTime.now());
                userRepository.save(user);
                
                // Audit logging for successful login
                if (featureFlagService.isAuditLoggingEnabled()) {
                    System.out.println("📋 AUDIT LOG: User login successful");
                    System.out.println("   User: " + user.getName() + " (" + user.getEmail() + ")");
                    System.out.println("   Role: " + user.getRole().name());
                    System.out.println("   Timestamp: " + LocalDateTime.now());
                }
            }

            JwtResponse jwtResponse = new JwtResponse();
            jwtResponse.setToken(jwt);
            jwtResponse.setId(userDetails.getId());
            jwtResponse.setName(userDetails.getName());
            jwtResponse.setEmail(userDetails.getUsername());
            jwtResponse.setRole(user != null ? user.getRole() : User.Role.DEVELOPER);
            jwtResponse.setProfilePhoto(user != null ? user.getProfilePhoto() : null);
            jwtResponse.setLastLogin(user != null ? user.getLastLogin() : null);
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            System.err.println("Authentication failed: " + e.getMessage());
            e.printStackTrace();
            
            // Audit logging for failed login
            if (featureFlagService.isAuditLoggingEnabled()) {
                System.out.println("📋 AUDIT LOG: User login failed");
                System.out.println("   Email: " + loginRequest.getEmail());
                System.out.println("   Error: " + e.getMessage());
                System.out.println("   Timestamp: " + LocalDateTime.now());
            }
            
            // Check if user exists to determine the specific error
            User user = userRepository.findByEmail(loginRequest.getEmail()).orElse(null);
            Map<String, String> response = new HashMap<>();
            
            if (user == null) {
                response.put("message", "Email not found. Please check your email address.");
                return ResponseEntity.status(401).body(response);
            } else {
                // User exists but password is wrong
                response.put("message", "Incorrect password. Please check your password.");
                return ResponseEntity.status(401).body(response);
            }
        }
    }

    @PostMapping("/signup")
    @Operation(
        summary = "User Registration",
        description = "Register a new user account. Requires user registration feature flag to be enabled.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "User registration data",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = User.class),
                examples = {
                    @ExampleObject(
                        name = "Developer Registration",
                        value = "{\"name\": \"John Doe\", \"email\": \"john@example.com\", \"password\": \"password123\", \"role\": \"DEVELOPER\"}"
                    )
                }
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "User registered successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Success",
                        value = "{\"message\": \"User registered successfully!\"}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Email already taken",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Email Taken",
                        value = "{\"message\": \"Error: Email is already taken!\"}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "403",
            description = "User registration disabled",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Registration Disabled",
                        value = "{\"message\": \"User registration is currently disabled by administrator.\"}"
                    )
                }
            )
        )
    })
    public ResponseEntity<?> registerUser(@Valid @RequestBody User signUpRequest) {
        // Check user registration feature flag
        if (!featureFlagService.isUserRegistrationEnabled()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "User registration is currently disabled by administrator.");
            return ResponseEntity.status(403).body(response);
        }
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Error: Email is already taken!");
            return ResponseEntity.badRequest().body(response);
        }

        // Create new user's account
        User user = new User();
        user.setName(signUpRequest.getName());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));
        user.setRole(signUpRequest.getRole() != null ? signUpRequest.getRole() : User.Role.DEVELOPER);

        userRepository.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("message", "User registered successfully!");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(
        summary = "User Logout",
        description = "Logout user and invalidate JWT token by adding it to blacklist.",
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "User logged out successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Success",
                        value = "{\"message\": \"User logged out successfully!\"}"
                    )
                }
            )
        )
    })
    public ResponseEntity<?> logoutUser(@RequestHeader("Authorization") String authHeader) {
        try {
            // Extract token from Authorization header
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                // Add token to blacklist
                tokenBlacklistService.blacklistToken(token);
            }
            
            // Clear the security context
            SecurityContextHolder.clearContext();
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "User logged out successfully!");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Logout completed");
            return ResponseEntity.ok(response);
        }
    }

    @PostMapping("/mfa/verify")
    @Operation(
        summary = "Verify MFA Code",
        description = "Verify MFA code and complete authentication process.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "MFA verification code",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = MfaRequest.class),
                examples = {
                    @ExampleObject(
                        name = "MFA Code",
                        value = "{\"code\": 123456}"
                    )
                }
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "MFA verification successful",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = JwtResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid MFA code",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Invalid Code",
                        value = "{\"message\": \"Invalid MFA code\"}"
                    )
                }
            )
        )
    })
    public ResponseEntity<?> verifyMfaCode(@Valid @RequestBody MfaRequest mfaRequest, @RequestHeader("Authorization") String authHeader) {
        try {
            System.out.println("MFA verification request received");
            
            // Extract token from Authorization header
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
                System.out.println("Token extracted: " + token.substring(0, Math.min(20, token.length())) + "...");
            }
            
            if (token == null) {
                System.out.println("No token provided");
                Map<String, String> response = new HashMap<>();
                response.put("message", "Authorization token required.");
                return ResponseEntity.status(401).body(response);
            }
            
            // Get user email from token
            String email = jwtUtils.getUserNameFromJwtToken(token);
            System.out.println("Email from token: " + email);
            
            if (email == null) {
                System.out.println("Invalid token - no email found");
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid token.");
                return ResponseEntity.status(401).body(response);
            }
            
            Integer code = mfaRequest.getCode();
            System.out.println("MFA code received: " + code);

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                System.out.println("User not found for email: " + email);
                Map<String, String> response = new HashMap<>();
                response.put("message", "User not found.");
                return ResponseEntity.status(404).body(response);
            }
            
            System.out.println("User found: " + user.getName() + " (" + user.getEmail() + ")");
            System.out.println("User MFA secret: " + (user.getMfaSecret() != null ? "exists" : "null"));
            System.out.println("User MFA enabled: " + user.getMfaEnabled());

            if (mfaService.verifyMfaCode(email, code)) {
                try {
                    System.out.println("MFA verification successful");
                    // MFA verification successful, generate new JWT directly from user data
                    // No need to re-authenticate since we already have the user from token
                    
                    System.out.println("MFA verification successful for user: " + user.getEmail());

                    // Update last login
                    if (user != null) {
                        user.setLastLogin(LocalDateTime.now());
                        userRepository.save(user);
                        
                        // Audit logging for successful login
                        if (featureFlagService.isAuditLoggingEnabled()) {
                            System.out.println("📋 AUDIT LOG: User login successful (MFA)");
                            System.out.println("   User: " + user.getName() + " (" + user.getEmail() + ")");
                            System.out.println("   Role: " + user.getRole().name());
                            System.out.println("   Timestamp: " + LocalDateTime.now());
                        }
                    }

                    // Generate JWT directly from user data
                    String jwt = jwtUtils.generateTokenFromUsername(user.getEmail());
                    System.out.println("JWT generated successfully");

                    JwtResponse jwtResponse = new JwtResponse();
                    jwtResponse.setToken(jwt);
                    jwtResponse.setId(user.getId());
                    jwtResponse.setName(user.getName());
                    jwtResponse.setEmail(user.getEmail());
                    jwtResponse.setRole(user.getRole());
                    jwtResponse.setProfilePhoto(user.getProfilePhoto());
                    jwtResponse.setLastLogin(user.getLastLogin());
                    return ResponseEntity.ok(jwtResponse);
                } catch (Exception e) {
                    System.err.println("Error generating JWT response: " + e.getMessage());
                    e.printStackTrace();
                    Map<String, String> response = new HashMap<>();
                    response.put("message", "Error generating authentication token.");
                    return ResponseEntity.status(500).body(response);
                }
            } else {
                System.out.println("MFA verification failed - invalid code");
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid MFA code.");
                return ResponseEntity.status(401).body(response);
            }
        } catch (Exception e) {
            System.err.println("MFA verification failed: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "MFA verification failed.");
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/mfa/setup")
    @Operation(
        summary = "Setup MFA",
        description = "Initialize MFA setup process and return QR code for authenticator app.",
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "MFA setup initiated",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Setup Response",
                        value = "{\"qrCodeUrl\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...\", \"secretKey\": \"JBSWY3DPEHPK3PXP\"}"
                    )
                }
            )
        )
    })
    public ResponseEntity<?> setupMfa(@RequestHeader("Authorization") String authHeader) {
        try {
            // Extract token from Authorization header
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
            
            if (token == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Authorization token required.");
                return ResponseEntity.status(401).body(response);
            }
            
            // Get user email from token
            String email = jwtUtils.getUserNameFromJwtToken(token);
            if (email == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid token.");
                return ResponseEntity.status(401).body(response);
            }
            
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "User not found.");
                return ResponseEntity.status(404).body(response);
            }

            Map<String, Object> mfaData = mfaService.generateMfaSecret(email);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("secret", mfaData.get("secret"));
            response.put("qrCodeUrl", mfaData.get("qrCodeUrl"));
            response.put("backupCodes", mfaData.get("backupCodes"));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("MFA setup failed: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "MFA setup failed.");
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/mfa/enable")
    @Operation(
        summary = "Enable MFA",
        description = "Enable MFA for user account after successful verification.",
        security = @SecurityRequirement(name = "Bearer Authentication"),
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "MFA verification code to enable",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = MfaRequest.class),
                examples = {
                    @ExampleObject(
                        name = "Enable MFA",
                        value = "{\"code\": 123456}"
                    )
                }
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "MFA enabled successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Success",
                        value = "{\"message\": \"MFA enabled successfully\"}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid MFA code",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Invalid Code",
                        value = "{\"message\": \"Invalid MFA code\"}"
                    )
                }
            )
        )
    })
    public ResponseEntity<?> enableMfa(@Valid @RequestBody MfaRequest mfaRequest, @RequestHeader("Authorization") String authHeader) {
        try {
            // Extract token from Authorization header
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
            
            if (token == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Authorization token required.");
                return ResponseEntity.status(401).body(response);
            }
            
            // Get user email from token
            String email = jwtUtils.getUserNameFromJwtToken(token);
            if (email == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid token.");
                return ResponseEntity.status(401).body(response);
            }
            
            Integer code = mfaRequest.getCode();

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "User not found.");
                return ResponseEntity.status(404).body(response);
            }

            if (mfaService.enableMfa(email, code)) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "MFA enabled successfully.");
                return ResponseEntity.ok(response);
            } else {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid MFA code.");
                return ResponseEntity.status(401).body(response);
            }
        } catch (Exception e) {
            System.err.println("MFA enable failed: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "MFA enable failed.");
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/mfa/disable")
    @Operation(
        summary = "Disable MFA",
        description = "Disable MFA for a user account (Admin only).",
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "MFA disabled successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "Success",
                        value = "{\"message\": \"MFA disabled successfully\"}"
                    )
                }
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "User not found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "User Not Found",
                        value = "{\"message\": \"User not found\"}"
                    )
                }
            )
        )
    })
    public ResponseEntity<?> disableMfa(@RequestParam String email) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "User not found.");
                return ResponseEntity.status(404).body(response);
            }

            if (mfaService.disableMfa(email)) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "MFA disabled successfully.");
                return ResponseEntity.ok(response);
            } else {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Failed to disable MFA.");
                return ResponseEntity.status(500).body(response);
            }
        } catch (Exception e) {
            System.err.println("MFA disable failed: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "MFA disable failed.");
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/mfa/status")
    @Operation(
        summary = "Get MFA Status",
        description = "Get MFA status for the authenticated user.",
        security = @SecurityRequirement(name = "Bearer Authentication")
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "MFA status retrieved",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Map.class),
                examples = {
                    @ExampleObject(
                        name = "MFA Enabled",
                        value = "{\"enabled\": true, \"setupCompleted\": true}"
                    ),
                    @ExampleObject(
                        name = "MFA Disabled",
                        value = "{\"enabled\": false, \"setupCompleted\": false}"
                    )
                }
            )
        )
    })
    public ResponseEntity<?> getMfaStatus(@RequestHeader("Authorization") String authHeader) {
        try {
            // Extract token from Authorization header
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
            
            if (token == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Authorization token required.");
                return ResponseEntity.status(401).body(response);
            }
            
            // Get user email from token
            String email = jwtUtils.getUserNameFromJwtToken(token);
            if (email == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Invalid token.");
                return ResponseEntity.status(401).body(response);
            }
            
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "User not found.");
                return ResponseEntity.status(404).body(response);
            }

            // Generate new JWT token for the user
            String jwt = jwtUtils.generateTokenFromUsername(user.getEmail());

            // Return user data for MFA setup completion
            JwtResponse jwtResponse = new JwtResponse();
            jwtResponse.setToken(jwt);
            jwtResponse.setId(user.getId());
            jwtResponse.setName(user.getName());
            jwtResponse.setEmail(user.getEmail());
            jwtResponse.setRole(user.getRole());
            jwtResponse.setProfilePhoto(user.getProfilePhoto());
            jwtResponse.setLastLogin(user.getLastLogin());
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            System.err.println("Get MFA status failed: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "Failed to get MFA status.");
            return ResponseEntity.status(500).body(response);
        }
    }
}