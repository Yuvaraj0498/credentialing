package com.zmartcredential.repository;

import com.zmartcredential.entity.PackageFeature;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PackageFeatureRepository extends JpaRepository<PackageFeature, Long> {

    List<PackageFeature> findByPackageCodeOrderBySortOrderAsc(String packageCode);
}
