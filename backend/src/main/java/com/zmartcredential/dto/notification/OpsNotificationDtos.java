package com.zmartcredential.dto.notification;

import java.time.LocalDateTime;
import java.util.List;

/** In-app notifications (NotificationsView, bell badge). */
public final class OpsNotificationDtos {

    private OpsNotificationDtos() {
    }

    public record NotificationRow(
            Long id,
            String title,
            String body,
            String icon,
            String color,
            boolean read,
            boolean broadcast,
            LocalDateTime createdAt) {
    }

    public record NotificationListResponse(List<NotificationRow> items, long total, long unread) {
    }

    public record UnreadCountResponse(long count) {
    }

    public record ReadAllResponse(int updated) {
    }
}
