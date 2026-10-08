package com.zmartcredential.repository;

import com.zmartcredential.entity.RefreshToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // organization module
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query("update RefreshToken t set t.revokedAt = :now where t.revokedAt is null and t.userId in (select u.id from AppUser u where u.orgId = :orgId)")
    int revokeAllForOrg(@org.springframework.data.repository.query.Param("orgId") Long orgId, @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);
}
