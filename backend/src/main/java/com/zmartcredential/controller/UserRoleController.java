package com.zmartcredential.controller;

import com.zmartcredential.dto.organization.UserRoleDtos.UserRoleActiveRequest;
import com.zmartcredential.dto.organization.UserRoleDtos.UserRoleRequest;
import com.zmartcredential.dto.organization.UserRoleDtos.UserRoleResponse;
import com.zmartcredential.service.UserRoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User roles")
@RestController
@RequestMapping("/api/user-roles")
@RequiredArgsConstructor
public class UserRoleController {

    private final UserRoleService service;

    @Operation(summary = "List role names (used by Users → Add user)")
    @GetMapping
    public List<UserRoleResponse> list() {
        return service.list();
    }

    @Operation(summary = "Add a role name (super admin)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserRoleResponse create(@Valid @RequestBody UserRoleRequest req) {
        return service.create(req);
    }

    @Operation(summary = "Rename a role (super admin)")
    @PutMapping("/{id}")
    public UserRoleResponse update(@PathVariable Long id, @Valid @RequestBody UserRoleRequest req) {
        return service.update(id, req);
    }

    @Operation(summary = "Enable or disable a role — users with a disabled role cannot sign in (super admin)")
    @PatchMapping("/{id}/active")
    public UserRoleResponse setActive(@PathVariable Long id, @Valid @RequestBody UserRoleActiveRequest req) {
        return service.setActive(id, req.active());
    }

    @Operation(summary = "Delete a role (its users move to the role given in moveTo) — super admin")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @RequestParam(required = false) Long moveTo) {
        service.delete(id, moveTo);
    }
}
