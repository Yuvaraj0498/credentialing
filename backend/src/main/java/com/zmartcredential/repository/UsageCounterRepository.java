package com.zmartcredential.repository;

import com.zmartcredential.entity.UsageCounter;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsageCounterRepository extends JpaRepository<UsageCounter, UsageCounter.Key> {

    List<UsageCounter> findByOrgId(Long orgId);
}
