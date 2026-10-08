package com.zmartcredential.repository;

import com.zmartcredential.entity.PasswordReset;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, Long> {

    List<PasswordReset> findByUserIdAndUsedAtIsNull(Long userId);

    Optional<PasswordReset> findFirstByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(Long userId);

    Optional<PasswordReset> findByResetTokenHash(String resetTokenHash);
}
