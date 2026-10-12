package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** A "document expires in 30 days" notice that was sent (once per document and expiration date). */
@Entity
@Table(name = "document_expiry_notice")
@Getter
@Setter
@NoArgsConstructor
public class DocumentExpiryNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long documentId;

    private LocalDate expiresAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime sentAt;
}
