package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long userId;

    private String entity;

    private Long entityId;

    private String action;

    private String summary;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
