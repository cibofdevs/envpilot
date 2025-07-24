package com.cibofdevs.envpilot.dto;

import com.cibofdevs.envpilot.model.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Schema(description = "JWT authentication response")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JwtResponse {
    @Schema(description = "JWT access token", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    private String token;
    
    @Schema(description = "Token type", example = "Bearer")
    private String type = "Bearer";
    
    @Schema(description = "User ID", example = "1")
    private Long id;
    
    @Schema(description = "User full name", example = "Admin User")
    private String name;
    
    @Schema(description = "User email address", example = "admin@envpilot.com")
    private String email;
    
    @Schema(description = "User role", example = "ADMIN")
    private User.Role role;
    
    @Schema(description = "User profile photo URL", example = "https://example.com/photo.jpg")
    private String profilePhoto;
    
    @Schema(description = "Last login timestamp", example = "2024-01-15T10:30:00")
    private LocalDateTime lastLogin;
}