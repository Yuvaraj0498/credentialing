package com.zmartcredential.service;

import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.ProviderInvite;
import com.zmartcredential.repository.ProviderInviteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;

/** Issues a provider's secure upload link (token + 6-digit PIN); a new link supersedes the provider's older open links. */
@Component
@RequiredArgsConstructor
public class SecureLinkIssuer {

    public static final int VALID_DAYS = 7;
    public static final DateTimeFormatter EXPIRY_FMT = DateTimeFormatter.ofPattern("MMMM d, yyyy");

    private final ProviderInviteRepository inviteRepository;
    private final CryptoService cryptoService;

    public ProviderInvite issue(Provider provider, String email, Long createdBy) {
        for (ProviderInvite old : inviteRepository.findByProviderIdAndStatusIn(provider.getId(), Set.of("sent", "opened"))) {
            old.setStatus("revoked");
        }
        ProviderInvite inv = new ProviderInvite();
        inv.setOrgId(provider.getOrgId());
        inv.setProviderId(provider.getId());
        inv.setEmail(email);
        inv.setToken(cryptoService.randomToken(32));
        inv.setPin(cryptoService.randomPin(6));
        inv.setExpiresAt(LocalDateTime.now().plusDays(VALID_DAYS));
        inv.setStatus("sent");
        inv.setCreatedBy(createdBy);
        return inviteRepository.save(inv);
    }

    /** Admin-app path of the link (relative; emails prefix MailService.publicUrl()). */
    public static String uploadPath(ProviderInvite inv) {
        return "/admin/upload/" + inv.getToken();
    }
}
