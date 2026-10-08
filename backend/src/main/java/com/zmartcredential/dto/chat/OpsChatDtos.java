package com.zmartcredential.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/** Team chat (ChatView / NewChannelModal). */
public final class OpsChatDtos {

    private OpsChatDtos() {
    }

    public record LastMessage(Long authorId, String authorName, String body, LocalDateTime createdAt) {
    }

    public record ChannelItem(
            Long id,
            String conversationId,
            String name,
            String description,
            String icon,
            long unread,
            LocalDateTime lastMessageAt,
            LastMessage lastMessage) {
    }

    public record DirectMessageItem(
            Long userId,
            String displayName,
            String username,
            String role,
            String title,
            String conversationId,
            long unread,
            LocalDateTime lastMessageAt,
            LastMessage lastMessage) {
    }

    public record ChatStateResponse(
            Long currentUserId,
            List<ChannelItem> channels,
            List<DirectMessageItem> directMessages,
            long totalUnread) {
    }

    public record ChatMessageItem(Long id, String conversationId, Long authorId, String authorName, String body,
                                  LocalDateTime createdAt) {
    }

    public record SendMessageRequest(
            @NotBlank(message = "Message cannot be empty")
            @Size(max = 4000, message = "Message must be at most 4000 characters")
            String body) {
    }

    public record CreateChannelRequest(
            @NotBlank(message = "Channel name is required")
            @Size(max = 80, message = "Channel name must be at most 80 characters")
            String name,
            @Size(max = 255, message = "Description must be at most 255 characters")
            String description) {
    }
}
