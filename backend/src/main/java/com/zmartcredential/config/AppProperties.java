package com.zmartcredential.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String encryptionKey,
        boolean cookieSecure,
        Jwt jwt,
        Cors cors,
        Storage storage,
        Mail mail,
        PortalLogin portalLogin,
        /* public site address for links in emails, e.g. https://desssnext.desss-portfolio.com */
        String publicUrl) {

    public record Jwt(String secret, int accessTokenMinutes, int refreshTokenDays) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Storage(String path) {}

    /** enabled=false: emails are only logged (email_log status "queued"), nothing is sent. */
    public record Mail(boolean enabled, String from, String fromName) {}

    /**
     * Automatic payer-portal login with a headless Chrome. chromeBinary: path to Chrome/Chromium (blank = auto-detect /
     * Selenium Manager download). allowPrivateHosts: allow portal URLs on localhost / private networks (testing only).
     */
    public record PortalLogin(boolean enabled, String chromeBinary, boolean allowPrivateHosts, int timeoutSeconds) {}
}
