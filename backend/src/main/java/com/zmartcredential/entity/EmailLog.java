package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "email_log")
@Getter
@Setter
@NoArgsConstructor
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private Long scheduleId;

    private String toEmail;

    private String subject;

    private String status = "queued";

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
