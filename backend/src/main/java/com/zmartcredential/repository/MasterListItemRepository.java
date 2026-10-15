package com.zmartcredential.repository;

import com.zmartcredential.entity.MasterListItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MasterListItemRepository extends JpaRepository<MasterListItem, Long> {

    List<MasterListItem> findByListKey(String listKey);
}
