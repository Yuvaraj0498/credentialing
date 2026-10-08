package com.zmartcredential.config;

import com.zmartcredential.exception.ErrorResponse;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.security.ActiveAccountFilter;
import com.zmartcredential.security.JwtService;
import com.zmartcredential.security.PrincipalAuthentication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.json.JsonMapper;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class SecurityConfig {

    private static final JsonMapper JSON = JsonMapper.builder().findAndAddModules().build();

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwtService, AppUserRepository userRepository,
                                                   OrganizationRepository organizationRepository) throws Exception {
        http
            .csrf(c -> c.disable()) // stateless bearer-token API
            .cors(c -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/refresh", "/api/auth/logout",
                        "/api/auth/signup/**", "/api/auth/forgot-password", "/api/auth/forgot-password/**", "/api/public/**").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/error").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll())
            .oauth2ResourceServer(o -> o
                .jwt(j -> j.decoder(jwtService.decoder()).jwtAuthenticationConverter(PrincipalAuthentication::fromJwt))
                .authenticationEntryPoint((req, res, ex) -> writeError(req, res, HttpStatus.UNAUTHORIZED,
                        "Your session has expired or is invalid. Please sign in again."))
                .accessDeniedHandler((req, res, ex) -> writeError(req, res, HttpStatus.FORBIDDEN,
                        "You do not have permission to perform this action")))
            // re-check disabled / deleted / changed users and suspended orgs on every request
            .addFilterAfter(new ActiveAccountFilter(userRepository, organizationRepository,
                    (req, res, msg) -> writeError(req, res, HttpStatus.UNAUTHORIZED, msg)), BearerTokenAuthenticationFilter.class)
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> writeError(req, res, HttpStatus.UNAUTHORIZED,
                        "Authentication required"))
                .accessDeniedHandler((req, res, ex) -> writeError(req, res, HttpStatus.FORBIDDEN,
                        "You do not have permission to perform this action")));
        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder(JwtService jwtService) {
        return jwtService.decoder();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(props.cors().allowedOrigins());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Org-Id"));
        cfg.setExposedHeaders(List.of("Content-Disposition"));
        cfg.setAllowCredentials(true); // refresh-token cookie on /api/auth
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cfg);
        return source;
    }

    private static void writeError(HttpServletRequest req, HttpServletResponse res, HttpStatus status, String message)
            throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse body = new ErrorResponse(status.value(), status.getReasonPhrase(), message, null,
                Instant.now(), req.getRequestURI());
        res.getWriter().write(JSON.writeValueAsString(body));
    }
}
