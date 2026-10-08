package com.zmartcredential.repository;

import com.zmartcredential.entity.Invoice;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByIdAndOrgId(Long id, Long orgId);

    long countByOrgIdAndStatusNotIn(Long orgId, java.util.Collection<String> statuses);

    List<Invoice> findByOrgId(Long orgId);

    List<Invoice> findByOrgIdOrderByInvoiceDateDesc(Long orgId);
}
