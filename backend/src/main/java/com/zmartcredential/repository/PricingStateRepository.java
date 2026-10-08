package com.zmartcredential.repository;

import com.zmartcredential.entity.PricingState;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PricingStateRepository extends JpaRepository<PricingState, String> {

    List<PricingState> findAllByOrderByCodeAsc();
}
