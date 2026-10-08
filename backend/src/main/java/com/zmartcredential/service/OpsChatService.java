package com.zmartcredential.service;

import com.zmartcredential.dto.chat.OpsChatDtos.ChannelItem;
import com.zmartcredential.dto.chat.OpsChatDtos.ChatMessageItem;
import com.zmartcredential.dto.chat.OpsChatDtos.ChatStateResponse;
import com.zmartcredential.dto.chat.OpsChatDtos.CreateChannelRequest;
import com.zmartcredential.dto.chat.OpsChatDtos.DirectMessageItem;
import com.zmartcredential.dto.chat.OpsChatDtos.LastMessage;
import com.zmartcredential.entity.AppUser;
import com.zmartcredential.entity.ChatChannel;
import com.zmartcredential.entity.ChatMessage;
import com.zmartcredential.entity.ChatRead;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.ForbiddenException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.AppUserRepository;
import com.zmartcredential.repository.ChatChannelRepository;
import com.zmartcredential.repository.ChatMessageRepository;
import com.zmartcredential.repository.ChatReadRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Team chat. Conversation ids: "ch_&lt;channelId&gt;" for org channels and "dm_&lt;minUserId&gt;__&lt;maxUserId&gt;"
 * for direct messages. Staff only; everything is scoped to the effective organization.
 */
@Service
@RequiredArgsConstructor
public class OpsChatService {

    private static final int PREVIEW_LEN = 140;

    private final ChatChannelRepository channelRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatReadRepository readRepository;
    private final AppUserRepository userRepository;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public ChatStateResponse state() {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        Long me = authContext.userId();

        List<ChatChannel> channels = channelRepository.findByOrgIdOrderByCreatedAtAsc(orgId);
        List<AppUser> partners = staffUsers(orgId).stream().filter(u -> !u.getId().equals(me)).toList();

        List<String> ids = new ArrayList<>();
        channels.forEach(c -> ids.add(channelConv(c.getId())));
        partners.forEach(u -> ids.add(dmConv(me, u.getId())));

        Map<String, ChatMessage> last = new HashMap<>();
        Map<String, Long> unread = new HashMap<>();
        if (!ids.isEmpty()) {
            for (ChatMessage m : messageRepository.findLastMessages(orgId, ids)) {
                ChatMessage prev = last.get(m.getConversationId());
                if (prev == null || prev.getId() < m.getId()) last.put(m.getConversationId(), m);
            }
            for (Object[] row : messageRepository.countUnread(orgId, me, ids)) {
                unread.put((String) row[0], ((Number) row[1]).longValue());
            }
        }
        Set<Long> authorIds = new HashSet<>();
        last.values().forEach(m -> authorIds.add(m.getAuthorId()));
        Map<Long, String> names = names(authorIds);

        List<ChannelItem> channelItems = channels.stream().map(c -> {
            String conv = channelConv(c.getId());
            ChatMessage m = last.get(conv);
            return new ChannelItem(c.getId(), conv, c.getName(), c.getDescription(), c.getIcon(),
                    unread.getOrDefault(conv, 0L), m == null ? null : m.getCreatedAt(), preview(m, names));
        }).toList();

        List<DirectMessageItem> dms = partners.stream().map(u -> {
            String conv = dmConv(me, u.getId());
            ChatMessage m = last.get(conv);
            return new DirectMessageItem(u.getId(), u.getDisplayName(), u.getUsername(), u.getRole(), u.getTitle(), conv,
                    unread.getOrDefault(conv, 0L), m == null ? null : m.getCreatedAt(), preview(m, names));
        }).toList();

        long total = unread.values().stream().mapToLong(Long::longValue).sum();
        return new ChatStateResponse(me, channelItems, dms, total);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageItem> messages(String conversationId, LocalDateTime after, Long afterId) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        checkAccess(orgId, conversationId);
        List<ChatMessage> rows;
        if (afterId != null) {
            rows = messageRepository.findByOrgIdAndConversationIdAndIdGreaterThanOrderByIdAsc(orgId, conversationId, afterId);
        } else if (after != null) {
            rows = messageRepository.findByOrgIdAndConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(orgId, conversationId, after);
        } else {
            rows = new ArrayList<>(messageRepository.findTop500ByOrgIdAndConversationIdOrderByCreatedAtDesc(orgId, conversationId));
            Collections.reverse(rows);
        }
        Set<Long> authorIds = new HashSet<>();
        rows.forEach(m -> authorIds.add(m.getAuthorId()));
        Map<Long, String> names = names(authorIds);
        return rows.stream().map(m -> toItem(m, names)).toList();
    }

    @Transactional
    public ChatMessageItem send(String conversationId, String body) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        checkAccess(orgId, conversationId);
        String text = body == null ? "" : body.strip();
        if (text.isEmpty()) throw new BadRequestException("Message cannot be empty");
        if (text.length() > 4000) throw new BadRequestException("Message must be at most 4000 characters");
        ChatMessage m = new ChatMessage();
        m.setOrgId(orgId);
        m.setConversationId(conversationId);
        m.setAuthorId(authContext.userId());
        m.setBody(text);
        messageRepository.saveAndFlush(m);
        markReadInternal(conversationId, m.getCreatedAt() != null ? m.getCreatedAt() : LocalDateTime.now(), m.getId());
        return toItem(m, Map.of(authContext.userId(), authContext.principal().displayName()));
    }

    @Transactional
    public void markRead(String conversationId) {
        authContext.requireStaff();
        checkAccess(authContext.orgId(), conversationId);
        markReadInternal(conversationId, LocalDateTime.now(), messageRepository.maxId(authContext.orgId(), conversationId));
    }

    @Transactional
    public void deleteMessage(Long id) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        ChatMessage m = messageRepository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Message", id));
        boolean author = m.getAuthorId().equals(authContext.userId());
        if (!author && !authContext.hasRole(Role.ORG_ADMIN, Role.PLATFORM_ADMIN)) {
            throw new ForbiddenException("You can only delete your own messages");
        }
        if (!author && m.getConversationId().startsWith("dm_")) {
            // moderators may not read other people's DMs, so they cannot delete them either
            checkAccess(orgId, m.getConversationId());
        }
        messageRepository.delete(m);
    }

    @Transactional
    public ChannelItem createChannel(CreateChannelRequest req) {
        authContext.requireStaff();
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.CLERK);
        Long orgId = authContext.orgId();
        String name = normalizeChannelName(req.name());
        if (name.isEmpty() || name.chars().allMatch(ch -> ch == '-')) {
            throw new BadRequestException("Channel name must contain letters or digits");
        }
        if (channelRepository.existsByOrgIdAndName(orgId, name)) {
            throw new ConflictException("A channel named #" + name + " already exists");
        }
        ChatChannel c = new ChatChannel();
        c.setOrgId(orgId);
        c.setName(name);
        c.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        c.setIcon("Hash");
        c.setCreatedBy(authContext.userId());
        channelRepository.save(c);
        return new ChannelItem(c.getId(), channelConv(c.getId()), c.getName(), c.getDescription(), c.getIcon(), 0, null, null);
    }

    /** Prototype normalization: lowercase, every char outside [a-z0-9_-] becomes '-'. */
    public static String normalizeChannelName(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_-]", "-");
    }

    // ---------------------------------------------------------------------------------------------

    private void checkAccess(Long orgId, String conversationId) {
        if (conversationId == null) throw new NotFoundException("Conversation not found");
        if (conversationId.startsWith("ch_")) {
            Long channelId = parseLong(conversationId.substring(3));
            if (channelId == null || channelRepository.findByIdAndOrgId(channelId, orgId).isEmpty()) {
                throw new NotFoundException("Conversation not found");
            }
            return;
        }
        if (conversationId.startsWith("dm_")) {
            String[] parts = conversationId.substring(3).split("__");
            if (parts.length == 2) {
                Long a = parseLong(parts[0]);
                Long b = parseLong(parts[1]);
                Long me = authContext.userId();
                if (a != null && b != null && a < b && (a.equals(me) || b.equals(me))) {
                    Long partnerId = a.equals(me) ? b : a;
                    AppUser partner = userRepository.findByIdAndOrgId(partnerId, orgId).orElse(null);
                    if (partner != null && !"provider".equals(partner.getRole())) return;
                }
            }
            throw new NotFoundException("Conversation not found");
        }
        throw new NotFoundException("Conversation not found");
    }

    private void markReadInternal(String conversationId, LocalDateTime at, Long messageId) {
        Long me = authContext.userId();
        ChatRead r = readRepository.findById(new ChatRead.Key(me, conversationId)).orElseGet(() -> {
            ChatRead n = new ChatRead();
            n.setUserId(me);
            n.setConversationId(conversationId);
            return n;
        });
        boolean changed = false;
        if (r.getLastReadAt() == null || r.getLastReadAt().isBefore(at)) {
            r.setLastReadAt(at);
            changed = true;
        }
        if (messageId != null && (r.getLastReadMessageId() == null || r.getLastReadMessageId() < messageId)) {
            r.setLastReadMessageId(messageId);
            changed = true;
        }
        if (changed) readRepository.save(r);
    }

    private List<AppUser> staffUsers(Long orgId) {
        return userRepository.findByOrgIdOrderByDisplayNameAsc(orgId).stream()
                .filter(u -> !"provider".equals(u.getRole()) && !Boolean.TRUE.equals(u.getDisabled()))
                .sorted(Comparator.comparing(AppUser::getDisplayName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private Map<Long, String> names(Set<Long> ids) {
        Map<Long, String> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        userRepository.findAllById(ids).forEach(u -> out.put(u.getId(), u.getDisplayName()));
        return out;
    }

    private static LastMessage preview(ChatMessage m, Map<Long, String> names) {
        if (m == null) return null;
        String body = m.getBody().length() > PREVIEW_LEN ? m.getBody().substring(0, PREVIEW_LEN) + "…" : m.getBody();
        return new LastMessage(m.getAuthorId(), names.getOrDefault(m.getAuthorId(), "Unknown user"), body, m.getCreatedAt());
    }

    private static ChatMessageItem toItem(ChatMessage m, Map<Long, String> names) {
        return new ChatMessageItem(m.getId(), m.getConversationId(), m.getAuthorId(),
                names.getOrDefault(m.getAuthorId(), "Unknown user"), m.getBody(), m.getCreatedAt());
    }

    public static String channelConv(Long channelId) {
        return "ch_" + channelId;
    }

    public static String dmConv(Long a, Long b) {
        return "dm_" + Math.min(a, b) + "__" + Math.max(a, b);
    }

    private static Long parseLong(String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
