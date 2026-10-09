package com.zmartcredential.controller;

import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.service.EmailRegistry;
import com.zmartcredential.service.OrgNames;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Lets the forms warn about a duplicate email while it is typed (the save checks it again). */
@Tag(name = "Email check")
@RestController
@RequestMapping("/api/email-check")
@RequiredArgsConstructor
public class EmailCheckController {

    private final EmailRegistry emailRegistry;
    private final AuthContext authContext;
    private final OrgNames orgNames;

    public record EmailCheckResponse(boolean available, String message) {
    }

    /** Create Admin: is this organization name free? (id: the organization being edited) */
    @Operation(summary = "Is this organization name free?")
    @GetMapping("/org-name")
    public EmailCheckResponse orgName(@RequestParam String name, @RequestParam(required = false) Long id) {
        authContext.principal();
        return orgNames.taken(name, id) ? new EmailCheckResponse(false, OrgNames.TAKEN) : new EmailCheckResponse(true, null);
    }

    /**
     * kind: user | provider | organization. id: the record being edited (empty when adding).
     * providerId: the provider a user login belongs to. orgAdmin: the user is the admin of the caller's organization.
     */
    @Operation(summary = "Is this email free for a new / edited user, provider or organization?")
    @GetMapping
    public EmailCheckResponse check(@RequestParam String email, @RequestParam String kind,
                                    @RequestParam(required = false) Long id,
                                    @RequestParam(required = false) Long providerId,
                                    @RequestParam(required = false, defaultValue = "false") boolean orgAdmin) {
        authContext.principal();
        try {
            switch (kind) {
                case "user" -> emailRegistry.requireFreeForUser(email, id, providerId, orgAdmin ? authContext.orgId() : null);
                case "provider" -> emailRegistry.requireFreeForProvider(email, id);
                case "organization" -> emailRegistry.requireFreeForOrganization(email, id);
                default -> throw new BadRequestException("kind must be user, provider or organization");
            }
            return new EmailCheckResponse(true, null);
        } catch (ConflictException e) {
            return new EmailCheckResponse(false, e.getMessage());
        }
    }
}
