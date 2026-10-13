package com.zmartcredential.repository;

import com.zmartcredential.entity.ProviderAdditionalDocument;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProviderAdditionalDocumentRepository extends JpaRepository<ProviderAdditionalDocument, Long> {

    List<ProviderAdditionalDocument> findByProviderIdOrderByUploadedAtDesc(Long providerId);
}
