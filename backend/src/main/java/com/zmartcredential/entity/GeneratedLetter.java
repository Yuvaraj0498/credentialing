package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "generated_letter")
@Getter
@Setter
@NoArgsConstructor
public class GeneratedLetter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long providerId;

    private Long hospitalId;

    private String letterType;

    private LocalDate effectiveDate;

    private Long generatedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime generatedAt;
}
