package com.zmartcredential.repository;

import com.zmartcredential.entity.PricingBaseRate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PricingBaseRateRepository extends JpaRepository<PricingBaseRate, PricingBaseRate.Key> {
}
