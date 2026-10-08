package com.zmartcredential.repository;

import com.zmartcredential.entity.PayerFormField;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayerFormFieldRepository extends JpaRepository<PayerFormField, Long> {

    List<PayerFormField> findByFormIdOrderBySortOrderAsc(Long formId);

    List<PayerFormField> findByFormIdIsNullOrderBySortOrderAsc();
}
