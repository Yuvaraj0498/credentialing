package com.zmartcredential.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Sign-in → Forgot password: email → one-time code → new password. */
public final class PasswordResetDtos {

    private PasswordResetDtos() {
    }

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") @Size(max = 255)
            String email) {
    }

    public record VerifyCodeRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") @Size(max = 255)
            String email,
            @NotBlank(message = "Code is required") @Pattern(regexp = "^\\d{6}$", message = "Enter the 6-digit code")
            String code) {
    }

    public record ResetPasswordRequest(
            @NotBlank(message = "Reset token is required") String resetToken,
            @NotBlank(message = "New password is required") @Size(max = 100, message = "At most 100 characters")
            String password,
            @NotBlank(message = "Confirm the new password") String confirmPassword) {
    }

    public record MessageResponse(String message) {
    }

    public record VerifyCodeResponse(String resetToken) {
    }
}
