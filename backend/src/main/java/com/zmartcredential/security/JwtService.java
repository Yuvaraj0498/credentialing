package com.zmartcredential.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.zmartcredential.config.AppProperties;
import com.zmartcredential.entity.AppUser;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** Issues and verifies HS256 access tokens. The configured secret is hashed to a 256-bit key. */
@Service
public class JwtService {

    public static final String ISSUER = "zmartcredential";

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final int accessTokenMinutes;

    public JwtService(AppProperties props) {
        SecretKey key = new SecretKeySpec(sha256(props.jwt().secret()), "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        this.accessTokenMinutes = props.jwt().accessTokenMinutes();
    }

    public String issueAccessToken(AppUser user) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenMinutes, ChronoUnit.MINUTES))
                .subject(String.valueOf(user.getId()))
                .claim("role", user.getRole())
                .claim("uname", user.getUsername())
                .claim("name", user.getDisplayName());
        if (user.getOrgId() != null) claims.claim("org", user.getOrgId());
        if (user.getProviderId() != null) claims.claim("pid", user.getProviderId());
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }

    public long accessTokenTtlSeconds() {
        return accessTokenMinutes * 60L;
    }

    public JwtDecoder decoder() {
        return decoder;
    }

    static byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
