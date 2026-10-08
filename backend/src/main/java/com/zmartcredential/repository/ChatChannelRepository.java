package com.zmartcredential.repository;

import com.zmartcredential.entity.ChatChannel;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatChannelRepository extends JpaRepository<ChatChannel, Long> {

    Optional<ChatChannel> findByIdAndOrgId(Long id, Long orgId);

    List<ChatChannel> findByOrgId(Long orgId);

    List<ChatChannel> findByOrgIdOrderByCreatedAtAsc(Long orgId);

    boolean existsByOrgIdAndName(Long orgId, String name);
}
