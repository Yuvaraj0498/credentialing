package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String username;

    private String email;

    private String passwordHash;

    private String firstName;

    private String lastName;

    private String displayName;

    private String title;

    private String phone;

    private String role;

    /** role name picked from the super admin's User Roles list */
    private Long userRoleId;

    private Long providerId;

    private Boolean disabled = false;

    @Column(name = "is_self_signup")
    private Boolean selfSignup = false;

    @Column(name = "is_test_data")
    private Boolean testData = false;

    /** The organization's own admin (created by the super admin / at sign-up); listed in Create Admin. */
    private Boolean orgOwner = false;

    private LocalDateTime lastLoginAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
