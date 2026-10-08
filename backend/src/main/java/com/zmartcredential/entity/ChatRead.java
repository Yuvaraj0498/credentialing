package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "chat_read")
@IdClass(ChatRead.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class ChatRead {

    @Id
    private Long userId;

    @Id
    private String conversationId;

    private LocalDateTime lastReadAt;

    /** Newest message id the user has seen (ids are monotonic; timestamps may lack sub-second precision). */
    private Long lastReadMessageId;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long userId;
        private String conversationId;
    }
}
