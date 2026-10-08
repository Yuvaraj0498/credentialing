package com.zmartcredential.dto.enrollment;

/** Returned by endpoints whose external integration is deferred to a later phase. */
public record IntegrationDeferredResponse(String integration, String message) {

    public static IntegrationDeferredResponse of(String message) {
        return new IntegrationDeferredResponse("deferred", message);
    }
}
