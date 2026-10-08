package com.zmartcredential.controller;

import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicInviteInfo;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicInviteVerifyRequest;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicLinkStatus;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicProfileRequest;
import com.zmartcredential.dto.provider.ProviderInviteDtos.PublicUploadResult;
import com.zmartcredential.service.ProviderInviteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Public (no JWT) secure-link upload page: token in the URL + 6-digit PIN. */
@Tag(name = "Public provider upload")
@RestController
@RequestMapping("/api/public/invites")
@RequiredArgsConstructor
public class ProviderPublicInviteController {

    private final ProviderInviteService inviteService;

    @Operation(summary = "Link state before the PIN is entered (active, expired, locked, submitted, replaced)")
    @GetMapping("/{token}")
    public PublicLinkStatus status(@PathVariable String token) {
        return inviteService.status(token);
    }

    @Operation(summary = "Submit the provider's profile and close the link")
    @PostMapping("/{token}/profile")
    public PublicLinkStatus submitProfile(@PathVariable String token, @Valid @RequestBody PublicProfileRequest req) {
        return inviteService.submitProfile(token, req);
    }

    @Operation(summary = "Verify the PIN of a secure upload link")
    @PostMapping("/{token}/verify")
    public PublicInviteInfo verify(@PathVariable String token, @Valid @RequestBody PublicInviteVerifyRequest req) {
        return inviteService.verify(token, req.pin());
    }

    @Operation(summary = "Upload documents through a secure link (multipart files[], docType[], pin, optional expiresAt[])")
    @PostMapping(value = "/{token}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PublicUploadResult upload(@PathVariable String token, @RequestParam("pin") String pin,
                                     @RequestParam("files") List<MultipartFile> files, HttpServletRequest request) {
        return inviteService.publicUpload(token, pin, files, ProviderDocumentController.params(request, "docType"),
                ProviderDocumentController.params(request, "expiresAt"));
    }
}
