package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payer_submission")
@Getter
@Setter
@NoArgsConstructor
public class PayerSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private Long payerId;

    private Long enrollmentId;

    private String method;

    private String status;

    private String confirmationNumber;

    private String message;

    private Integer documentCount = 0;

    private Long submittedBy;

    private LocalDateTime submittedAt;
}
