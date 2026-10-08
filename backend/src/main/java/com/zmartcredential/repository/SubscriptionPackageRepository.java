package com.zmartcredential.repository;

import com.zmartcredential.entity.SubscriptionPackage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionPackageRepository extends JpaRepository<SubscriptionPackage, String> {

    List<SubscriptionPackage> findByActiveTrueOrderBySortOrderAsc();
}
