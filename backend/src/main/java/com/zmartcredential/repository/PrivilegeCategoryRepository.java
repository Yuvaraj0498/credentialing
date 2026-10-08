package com.zmartcredential.repository;

import com.zmartcredential.entity.PrivilegeCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrivilegeCategoryRepository extends JpaRepository<PrivilegeCategory, String> {
}
