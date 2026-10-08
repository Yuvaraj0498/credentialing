package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "location")
@Getter
@Setter
@NoArgsConstructor
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long practiceId;

    private String name;

    private String legalName;

    private String npi;

    private String locationType = "Primary";

    private String address;

    private String city;

    private String state;

    private String zip;

    private String phone;

    private BigDecimal lat;

    private BigDecimal lng;

    private Boolean active = true;

    @Column(name = "is_test_data")
    private Boolean testData = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
