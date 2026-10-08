package com.zmartcredential.service;

import com.zmartcredential.dto.notification.OpsNotificationDtos.NotificationListResponse;
import com.zmartcredential.dto.notification.OpsNotificationDtos.NotificationRow;
import com.zmartcredential.dto.notification.OpsNotificationDtos.ReadAllResponse;
import com.zmartcredential.entity.Notification;
import com.zmartcredential.exception.ForbiddenException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.NotificationRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.AuthPrincipal;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Notification inbox. Staff see org broadcasts (user_id NULL) plus their own rows; provider users see
 * only rows addressed to them (broadcasts contain other providers' data).
 * Broadcast rows have a single is_read flag shared by the whole organization.
 */
@Service
@RequiredArgsConstructor
public class OpsNotificationService {

    private final NotificationRepository repository;
    private final AuthContext authContext;

    @Transactional(readOnly = true)
    public NotificationListResponse list(String filter) {
        List<Notification> visible = visible();
        long unread = visible.stream().filter(n -> !Boolean.TRUE.equals(n.getRead())).count();
        boolean onlyUnread = "unread".equalsIgnoreCase(filter);
        List<NotificationRow> items = visible.stream()
                .filter(n -> !onlyUnread || !Boolean.TRUE.equals(n.getRead()))
                .map(OpsNotificationService::toRow)
                .toList();
        return new NotificationListResponse(items, visible.size(), unread);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return visible().stream().filter(n -> !Boolean.TRUE.equals(n.getRead())).count();
    }

    @Transactional
    public NotificationRow markRead(Long id) {
        Notification n = loadVisible(id);
        if (!Boolean.TRUE.equals(n.getRead())) {
            n.setRead(true);
            repository.save(n);
        }
        return toRow(n);
    }

    @Transactional
    public ReadAllResponse readAll() {
        int count = 0;
        for (Notification n : visible()) {
            if (!Boolean.TRUE.equals(n.getRead())) {
                n.setRead(true);
                count++;
            }
        }
        return new ReadAllResponse(count);
    }

    @Transactional
    public void delete(Long id) {
        Notification n = loadVisible(id);
        if (n.getUserId() == null && authContext.hasRole(Role.AUDITOR)) {
            throw new ForbiddenException("Auditors cannot delete organization-wide notifications");
        }
        repository.delete(n);
    }

    private List<Notification> visible() {
        AuthPrincipal p = authContext.principal();
        Long orgId = authContext.orgIdOrNull();
        if (orgId == null) return List.of();
        List<Notification> rows = repository.findVisibleToUser(orgId, p.userId());
        if (p.isProvider()) {
            rows = rows.stream().filter(n -> p.userId().equals(n.getUserId())).toList();
        }
        return rows;
    }

    private Notification loadVisible(Long id) {
        AuthPrincipal p = authContext.principal();
        Long orgId = authContext.orgIdOrNull();
        if (orgId == null) throw NotFoundException.of("Notification", id);
        Notification n = repository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Notification", id));
        boolean own = p.userId().equals(n.getUserId());
        boolean broadcast = n.getUserId() == null;
        if (!own && !(broadcast && !p.isProvider())) throw NotFoundException.of("Notification", id);
        return n;
    }

    private static NotificationRow toRow(Notification n) {
        return new NotificationRow(n.getId(), n.getTitle(), n.getBody(), n.getIcon(), n.getColor(),
                Boolean.TRUE.equals(n.getRead()), n.getUserId() == null, n.getCreatedAt());
    }
}
