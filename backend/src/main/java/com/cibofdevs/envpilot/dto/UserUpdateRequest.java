package com.cibofdevs.envpilot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "User update request data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequest {
    
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    @Schema(description = "User full name", example = "John Doe")
    private String name;
    
    @Email(message = "Email should be valid")
    @Schema(description = "User email address", example = "john@example.com")
    private String email;
    
    @Size(min = 6, message = "Password must be at least 6 characters")
    @Schema(description = "User password (optional for updates)", example = "newpassword123")
    private String password;
    
    @Schema(description = "User role", example = "DEVELOPER", allowableValues = {"ADMIN", "DEVELOPER", "QA"})
    private String role;
}