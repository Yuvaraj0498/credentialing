package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "chat_message")
@Getter
@Setter
@NoArgsConstructor
/** Deleting marks the row deleted (is_deleted = 1); deleted rows are left out of every query. */
@org.hibernate.annotations.SoftDelete(columnName = "is_deleted")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String conversationId;

    private Long authorId;

    private String body;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
