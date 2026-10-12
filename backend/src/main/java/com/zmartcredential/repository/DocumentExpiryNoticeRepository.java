package com.zmartcredential.repository;

import com.zmartcredential.entity.DocumentExpiryNotice;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentExpiryNoticeRepository extends JpaRepository<DocumentExpiryNotice, Long> {

    boolean existsByDocumentIdAndExpiresAt(Long documentId, LocalDate expiresAt);
}
