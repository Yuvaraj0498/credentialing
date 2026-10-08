package com.zmartcredential.security;

import java.util.Arrays;

public enum Role {
    PLATFORM_ADMIN("platform_admin"),
    ORG_ADMIN("org_admin"),
    CLERK("clerk"),
    PROVIDER("provider"),
    AUDITOR("auditor");

    private final String code;

    Role(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static Role fromCode(String code) {
        // "admin" is the prototype's legacy name for org_admin
        if ("admin".equals(code)) return ORG_ADMIN;
        return Arrays.stream(values()).filter(r -> r.code.equals(code)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown role: " + code));
    }

    public static boolean isValid(String code) {
        return Arrays.stream(values()).anyMatch(r -> r.code.equals(code));
    }
}
