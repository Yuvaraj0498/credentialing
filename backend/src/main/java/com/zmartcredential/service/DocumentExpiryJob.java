package com.zmartcredential.service;

import com.zmartcredential.repository.ProviderDocumentRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Sets the status of documents whose expiration date has passed to expired (shortly after start-up, then nightly). */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentExpiryJob {

    private final ProviderDocumentRepository documentRepository;

    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT6H")
    public void expirePastDue() {
        try {
            int n = documentRepository.expirePastDue(LocalDate.now());
            if (n > 0) log.info("{} document(s) passed their expiration date and are now expired", n);
        } catch (Exception e) {
            log.warn("Document expiry check failed: {}", e.getMessage());
        }
    }
}
