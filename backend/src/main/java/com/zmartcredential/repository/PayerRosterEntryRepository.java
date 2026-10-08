package com.zmartcredential.repository;

import com.zmartcredential.entity.PayerRosterEntry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayerRosterEntryRepository extends JpaRepository<PayerRosterEntry, Long> {

    List<PayerRosterEntry> findByUploadId(Long uploadId);
}
