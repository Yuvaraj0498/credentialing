package com.zmartcredential.repository;

import com.zmartcredential.entity.GeneratedLetter;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GeneratedLetterRepository extends JpaRepository<GeneratedLetter, Long> {

    Optional<GeneratedLetter> findByIdAndOrgId(Long id, Long orgId);

    List<GeneratedLetter> findByOrgId(Long orgId);

    List<GeneratedLetter> findByProviderIdOrderByGeneratedAtDesc(Long providerId);
}
