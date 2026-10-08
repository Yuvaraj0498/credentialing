package com.zmartcredential.repository;

import com.zmartcredential.entity.ChatMessage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    Optional<ChatMessage> findByIdAndOrgId(Long id, Long orgId);

    List<ChatMessage> findByOrgIdAndAuthorIdNot(Long orgId, Long authorId);

    List<ChatMessage> findByOrgId(Long orgId);

    List<ChatMessage> findByOrgIdAndConversationIdOrderByCreatedAtAsc(Long orgId, String conversationId);

    List<ChatMessage> findByOrgIdOrderByCreatedAtAsc(Long orgId);

    // --- operations module (chat) ---
    List<ChatMessage> findByOrgIdAndConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long orgId, String conversationId, java.time.LocalDateTime after);

    List<ChatMessage> findByOrgIdAndConversationIdAndIdGreaterThanOrderByIdAsc(Long orgId, String conversationId, Long afterId);

    List<ChatMessage> findTop500ByOrgIdAndConversationIdOrderByCreatedAtDesc(Long orgId, String conversationId);

    @org.springframework.data.jpa.repository.Query("select max(m.id) from ChatMessage m where m.orgId = :orgId and m.conversationId = :conv")
    Long maxId(@org.springframework.data.repository.query.Param("orgId") Long orgId,
               @org.springframework.data.repository.query.Param("conv") String conversationId);

    /** Newest message of each given conversation. */
    @org.springframework.data.jpa.repository.Query("select m from ChatMessage m where m.orgId = :orgId and m.conversationId in :ids "
            + "and m.id = (select max(m2.id) from ChatMessage m2 where m2.orgId = m.orgId and m2.conversationId = m.conversationId)")
    List<ChatMessage> findLastMessages(@org.springframework.data.repository.query.Param("orgId") Long orgId,
                                       @org.springframework.data.repository.query.Param("ids") java.util.Collection<String> ids);

    /** [conversationId, unreadCount] for messages by others after the user's last read message (legacy rows: last read time). */
    @org.springframework.data.jpa.repository.Query("select m.conversationId, count(m) from ChatMessage m where m.orgId = :orgId "
            + "and m.conversationId in :ids and m.authorId <> :userId and not exists ("
            + "select r from ChatRead r where r.userId = :userId and r.conversationId = m.conversationId and (r.lastReadMessageId >= m.id or (r.lastReadMessageId is null and r.lastReadAt >= m.createdAt))) "
            + "group by m.conversationId")
    List<Object[]> countUnread(@org.springframework.data.repository.query.Param("orgId") Long orgId,
                               @org.springframework.data.repository.query.Param("userId") Long userId,
                               @org.springframework.data.repository.query.Param("ids") java.util.Collection<String> ids);
}
