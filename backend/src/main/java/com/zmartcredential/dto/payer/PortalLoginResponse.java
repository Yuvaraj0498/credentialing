package com.zmartcredential.dto.payer;

/**
 * Result of the automatic payer-portal sign-in for a submission.
 * outcome: logged_in | login_failed | mfa_required | captcha | no_login_form | error.
 * screenshot: PNG of the portal page after the attempt, base64 (may be null).
 * loginLevel: provider | organization — which stored login was used.
 */
public record PortalLoginResponse(
        String outcome,
        String message,
        String portalUrl,
        String finalUrl,
        String pageTitle,
        String pageText,
        String screenshot,
        long durationMs,
        String username,
        String loginLevel,
        PayerSubmissionResponse submission) {
}
