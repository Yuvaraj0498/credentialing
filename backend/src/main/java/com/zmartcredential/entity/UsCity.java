package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** Master Data → City: a city of a US state (org_id null = everyone). Deleting marks it deleted. */
@Entity
@Table(name = "us_city")
@org.hibernate.annotations.SoftDelete(columnName = "is_deleted")
@Getter
@Setter
@NoArgsConstructor
public class UsCity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String stateCode;

    private BigDecimal lat;

    private BigDecimal lng;

    private Boolean active = true;

    private Long orgId;

    private Long createdByOrgId;

    private Long createdBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
