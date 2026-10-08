package com.zmartcredential.service;

import com.zmartcredential.entity.Notification;
import com.zmartcredential.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Creates in-app notifications (the prototype's addNotification). Other services call this
 * whenever something noteworthy happens (task created, documents uploaded, provider imported...).
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    public static final String ACCENT = "var(--accent)";
    public static final String SUCCESS = "var(--success)";
    public static final String DANGER = "var(--danger)";
    public static final String WARN = "var(--warn)";
    public static final String INFO = "var(--info)";

    private final NotificationRepository repository;

    /** Broadcast to every user of the organization. */
    public Notification notifyOrg(Long orgId, String title, String body, String icon, String color) {
        return create(orgId, null, title, body, icon, color);
    }

    /** Notification for one user. */
    public Notification notifyUser(Long orgId, Long userId, String title, String body, String icon, String color) {
        return create(orgId, userId, title, body, icon, color);
    }

    private Notification create(Long orgId, Long userId, String title, String body, String icon, String color) {
        Notification n = new Notification();
        n.setOrgId(orgId);
        n.setUserId(userId);
        n.setTitle(title);
        n.setBody(body);
        n.setIcon(icon == null ? "Bell" : icon);
        n.setColor(color == null ? ACCENT : color);
        n.setRead(false);
        return repository.save(n);
    }
}
