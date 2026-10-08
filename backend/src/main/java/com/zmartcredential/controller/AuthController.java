package com.zmartcredential.controller;

import com.zmartcredential.config.AppProperties;
import com.zmartcredential.dto.auth.AuthResponse;
import com.zmartcredential.dto.auth.LoginRequest;
import com.zmartcredential.dto.auth.MeResponse;
import com.zmartcredential.dto.auth.OrgSignupRequest;
import com.zmartcredential.dto.auth.ProviderSignupRequest;
import com.zmartcredential.dto.auth.RefreshRequest;
import com.zmartcredential.exception.UnauthorizedException;
import com.zmartcredential.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Authentication endpoints. The refresh token is delivered as an httpOnly, SameSite=Strict cookie scoped to
 * /api/auth so browser JavaScript never sees it; the short-lived access token is returned in the body and kept
 * in memory by the admin app. Non-browser clients may instead send {"refreshToken": "..."} in the body.
 */
@Tag(name = "Auth")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    public static final String REFRESH_COOKIE = "zc_refresh";

    private final AuthService authService;
    private final AppProperties props;

    @Operation(summary = "Sign in with username (or email) and password")
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletResponse res) {
        return withCookie(authService.login(req), res);
    }

    @Operation(summary = "Exchange the refresh token (cookie or body) for a new token pair (rotation)")
    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody(required = false) RefreshRequest req,
                                @CookieValue(name = REFRESH_COOKIE, required = false) String cookie,
                                HttpServletResponse res) {
        String token = req != null && req.refreshToken() != null ? req.refreshToken() : cookie;
        if (token == null || token.isBlank()) throw new UnauthorizedException("Not signed in");
        return withCookie(authService.refresh(token), res);
    }

    @Operation(summary = "Sign out: revoke the refresh token and clear the cookie")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestBody(required = false) RefreshRequest req,
                       @CookieValue(name = REFRESH_COOKIE, required = false) String cookie,
                       HttpServletResponse res) {
        authService.logout(req != null && req.refreshToken() != null ? req.refreshToken() : cookie);
        res.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
    }

    @Operation(summary = "Current user profile and permissions")
    @GetMapping("/me")
    public MeResponse me() {
        return authService.me();
    }

    @Operation(summary = "Create an organization account (org, admin user, subscription, payment method)")
    @PostMapping("/signup/organization")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse signupOrganization(@Valid @RequestBody OrgSignupRequest req, HttpServletResponse res) {
        return withCookie(authService.signupOrganization(req), res);
    }

    @Operation(summary = "Create a provider self-service account")
    @PostMapping("/signup/provider")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse signupProvider(@Valid @RequestBody ProviderSignupRequest req, HttpServletResponse res) {
        return withCookie(authService.signupProvider(req), res);
    }

    private AuthResponse withCookie(AuthResponse auth, HttpServletResponse res) {
        res.addHeader(HttpHeaders.SET_COOKIE,
                cookie(auth.refreshToken(), Duration.ofDays(props.jwt().refreshTokenDays())).toString());
        // the raw refresh token stays out of the JSON body for browser clients
        return new AuthResponse(auth.accessToken(), null, auth.expiresIn(), auth.user());
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(props.cookieSecure())
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(maxAge)
                .build();
    }
}
