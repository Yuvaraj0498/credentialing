package com.zmartcredential.controller;

import com.zmartcredential.dto.provider.ProviderInviteDtos.SecureLinkItem;
import com.zmartcredential.service.ProviderInviteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Admin "Secure Links": every provider link of the organization with its status. */
@Tag(name = "Secure links")
@RestController
@RequestMapping("/api/secure-links")
@RequiredArgsConstructor
public class SecureLinkController {

    private final ProviderInviteService inviteService;

    @Operation(summary = "Secure links sent to providers, newest first")
    @GetMapping
    public List<SecureLinkItem> list() {
        return inviteService.list();
    }

    @Operation(summary = "Delete a secure link (its portal URL stops working)")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        inviteService.delete(id);
    }
}
