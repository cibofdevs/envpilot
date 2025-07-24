package com.cibofdevs.envpilot.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Schema(description = "MFA verification request")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MfaRequest {
    @NotNull
    @Schema(description = "6-digit MFA code", example = "123456")
    private Integer code;
}