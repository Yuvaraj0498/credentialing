package com.zmartcredential.repository;

import com.zmartcredential.entity.Notification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Optional<Notification> findByIdAndOrgId(Long id, Long orgId);

    List<Notification> findByOrgId(Long orgId);

    @Query("select n from Notification n where n.orgId = :orgId and (n.userId is null or n.userId = :userId) order by n.createdAt desc")
    List<Notification> findVisibleToUser(@Param("orgId") Long orgId, @Param("userId") Long userId);

    @Query("select count(n) from Notification n where n.orgId = :orgId and (n.userId is null or n.userId = :userId) and n.read = false")
    long countUnreadVisibleToUser(@Param("orgId") Long orgId, @Param("userId") Long userId);
}
