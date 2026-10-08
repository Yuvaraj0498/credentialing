package com.zmartcredential.dto.auth;

public record AuthResponse(String accessToken, String refreshToken, long expiresIn, MeResponse user) {
}
