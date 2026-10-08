package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "payment_method")
@Getter
@Setter
@NoArgsConstructor
public class PaymentMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String brand;

    private String last4;

    private String exp;

    private String billingName;

    private String billingZip;

    @Column(name = "is_default")
    private Boolean defaultMethod = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
