package com.zmartcredential.repository;

import com.zmartcredential.entity.Payer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayerRepository extends JpaRepository<Payer, Long> {

    Optional<Payer> findByCode(String code);

    List<Payer> findAllByOrderBySortOrderAsc();

    List<Payer> findByActiveTrueOrderBySortOrderAsc();
}
