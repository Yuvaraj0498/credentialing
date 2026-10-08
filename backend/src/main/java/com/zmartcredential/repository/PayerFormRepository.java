package com.zmartcredential.repository;

import com.zmartcredential.entity.PayerForm;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayerFormRepository extends JpaRepository<PayerForm, Long> {

    List<PayerForm> findByPayerIdOrderBySortOrderAsc(Long payerId);
}
