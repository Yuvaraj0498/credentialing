package com.zmartcredential.controller;

import com.zmartcredential.dto.organization.UserDtos.UserCreateRequest;
import com.zmartcredential.dto.organization.UserDtos.UserDirectoryEntry;
import com.zmartcredential.dto.organization.UserDtos.UserDisabledRequest;
import com.zmartcredential.dto.organization.UserDtos.UserResponse;
import com.zmartcredential.dto.organization.UserDtos.UserUpdateRequest;
import com.zmartcredential.service.OrgUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Users")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class OrgUserController {

    private final OrgUserService service;

    @Operation(summary = "List users of the current organization")
    @GetMapping
    public List<UserResponse> list(@RequestParam(required = false) String q,
                                   @RequestParam(required = false) String role) {
        return service.list(q, role);
    }

    @Operation(summary = "Lightweight user directory for chat / assignee pickers")
    @GetMapping("/directory")
    public List<UserDirectoryEntry> directory(@RequestParam(defaultValue = "false") boolean includeProviders) {
        return service.directory(includeProviders);
    }

    @Operation(summary = "Get user")
    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Create user")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest req) {
        return service.create(req);
    }

    @Operation(summary = "Create a provider and their login together (Add User → Provider role)")
    @PostMapping("/with-provider")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createWithProvider(@Valid @RequestBody com.zmartcredential.dto.organization.UserDtos.UserWithProviderRequest req) {
        return service.createWithProvider(req);
    }

    @Operation(summary = "Update user (password changes only when provided)")
    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest req) {
        return service.update(id, req);
    }

    @Operation(summary = "Enable / disable a user")
    @PatchMapping("/{id}/disabled")
    public UserResponse setDisabled(@PathVariable Long id, @Valid @RequestBody UserDisabledRequest req) {
        return service.setDisabled(id, req.disabled());
    }

    @Operation(summary = "Delete user")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
