package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "verification_check")
@Getter
@Setter
@NoArgsConstructor
public class VerificationCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private String source;

    private String status;

    private String message;

    private LocalDateTime checkedAt;

    private Long runBy;
}
