package com.zmartcredential.dto.organization;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

/** Permissions page: matrix shape is {entity: {action: [roleIds allowed]}}. */
public final class PermissionDtos {

    private PermissionDtos() {
    }

    public record RoleInfo(String id, String label, String color, String desc) {
    }

    public record PermissionMatrixResponse(
            List<RoleInfo> roles,
            List<String> entities,
            List<String> actions,
            Map<String, Map<String, List<String>>> matrix,
            Map<String, Map<String, List<String>>> defaults,
            boolean hasOrgOverrides,
            boolean canEdit,
            boolean canEditDefaults) {
    }

    public record PermissionMatrixRequest(
            @NotNull(message = "matrix is required") Map<String, Map<String, List<String>>> matrix) {
    }
}
