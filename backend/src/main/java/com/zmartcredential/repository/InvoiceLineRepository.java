package com.zmartcredential.repository;

import com.zmartcredential.entity.InvoiceLine;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, Long> {

    List<InvoiceLine> findByInvoiceIdOrderBySortOrderAsc(Long invoiceId);

    List<InvoiceLine> findByInvoiceIdIn(Collection<Long> invoiceIds);

    List<InvoiceLine> findByProviderId(Long providerId);
}
