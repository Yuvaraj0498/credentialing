package com.zmartcredential.repository;

import com.zmartcredential.entity.ChatRead;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatReadRepository extends JpaRepository<ChatRead, ChatRead.Key> {

    List<ChatRead> findByUserId(Long userId);
}
