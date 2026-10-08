package com.zmartcredential.repository;

import com.zmartcredential.entity.PrivilegeItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrivilegeItemRepository extends JpaRepository<PrivilegeItem, Long> {

    List<PrivilegeItem> findByCategoryCodeOrderBySortOrderAsc(String categoryCode);
}
