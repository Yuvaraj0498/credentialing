package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "organization")
@Getter
@Setter
@NoArgsConstructor
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String orgType;

    private String taxId;

    private String website;

    private String address;

    private String city;

    private String state;

    private String zip;

    private String phone;

    private String email;

    private String inviteCode;

    private String status = "active";

    @Column(name = "is_self_signup")
    private Boolean selfSignup = false;

    private Integer sanctionsIntervalDays = 30;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
