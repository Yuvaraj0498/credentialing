package com.zmartcredential.controller;

import com.zmartcredential.dto.notification.OpsNotificationDtos.NotificationListResponse;
import com.zmartcredential.dto.notification.OpsNotificationDtos.NotificationRow;
import com.zmartcredential.dto.notification.OpsNotificationDtos.ReadAllResponse;
import com.zmartcredential.dto.notification.OpsNotificationDtos.UnreadCountResponse;
import com.zmartcredential.service.OpsNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Notifications")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class OpsNotificationController {

    private final OpsNotificationService service;

    @Operation(summary = "Notifications visible to the current user (filter=all|unread)")
    @GetMapping
    public NotificationListResponse list(@RequestParam(defaultValue = "all") String filter) {
        return service.list(filter);
    }

    @Operation(summary = "Unread notification count (bell badge)")
    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount() {
        return new UnreadCountResponse(service.unreadCount());
    }

    @Operation(summary = "Mark one notification read")
    @PatchMapping("/{id}/read")
    public NotificationRow markRead(@PathVariable Long id) {
        return service.markRead(id);
    }

    @Operation(summary = "Mark all visible notifications read")
    @PostMapping("/read-all")
    public ReadAllResponse readAll() {
        return service.readAll();
    }

    @Operation(summary = "Delete a notification")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
