package com.zmartcredential.controller;

import com.zmartcredential.dto.chat.OpsChatDtos.ChannelItem;
import com.zmartcredential.dto.chat.OpsChatDtos.ChatMessageItem;
import com.zmartcredential.dto.chat.OpsChatDtos.ChatStateResponse;
import com.zmartcredential.dto.chat.OpsChatDtos.CreateChannelRequest;
import com.zmartcredential.dto.chat.OpsChatDtos.SendMessageRequest;
import com.zmartcredential.service.OpsChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "Chat")
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class OpsChatController {

    private final OpsChatService service;

    @Operation(summary = "Sidebar state: channels, direct messages, unread counts")
    @GetMapping("/state")
    public ChatStateResponse state() {
        return service.state();
    }

    @Operation(summary = "Messages of a conversation (optionally only those after a message id, or after a timestamp)")
    @GetMapping("/conversations/{conversationId}/messages")
    public List<ChatMessageItem> messages(@PathVariable String conversationId,
                                          @RequestParam(required = false)
                                          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime after,
                                          @RequestParam(required = false) Long afterId) {
        return service.messages(conversationId, after, afterId);
    }

    @Operation(summary = "Send a message (also marks the conversation read)")
    @PostMapping("/conversations/{conversationId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageItem send(@PathVariable String conversationId, @Valid @RequestBody SendMessageRequest req) {
        return service.send(conversationId, req.body());
    }

    @Operation(summary = "Mark a conversation read")
    @PutMapping("/conversations/{conversationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable String conversationId) {
        service.markRead(conversationId);
    }

    @Operation(summary = "Delete a message (author, or org admin)")
    @DeleteMapping("/messages/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.deleteMessage(id);
    }

    @Operation(summary = "Create a channel")
    @PostMapping("/channels")
    @ResponseStatus(HttpStatus.CREATED)
    public ChannelItem createChannel(@Valid @RequestBody CreateChannelRequest req) {
        return service.createChannel(req);
    }
}
