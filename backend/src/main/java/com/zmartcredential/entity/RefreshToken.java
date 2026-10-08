package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "refresh_token")
@Getter
@Setter
@NoArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private String tokenHash;

    private LocalDateTime expiresAt;

    private LocalDateTime revokedAt;

    private String userAgent;

    private String ip;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
