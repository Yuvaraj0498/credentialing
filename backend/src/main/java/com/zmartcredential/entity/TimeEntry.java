package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "time_entry")
@Getter
@Setter
@NoArgsConstructor
public class TimeEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private Long userId;

    private LocalDateTime startedAt;

    private LocalDateTime endedAt;

    private Integer seconds;

    private String note;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
