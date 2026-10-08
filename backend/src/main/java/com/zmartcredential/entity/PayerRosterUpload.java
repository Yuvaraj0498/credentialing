package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "payer_roster_upload")
@Getter
@Setter
@NoArgsConstructor
public class PayerRosterUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long payerId;

    private String fileName;

    private Integer rowCount = 0;

    private Long uploadedBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime uploadedAt;
}
