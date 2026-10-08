package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "invoice")
@Getter
@Setter
@NoArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String number;

    private LocalDate invoiceDate;

    private LocalDate dueDate;

    private String status = "due";

    private LocalDate paidDate;

    private Long paymentMethodId;

    private String paidMethodLabel;

    private BigDecimal subtotal = new BigDecimal("0");

    private BigDecimal tax = new BigDecimal("0");

    private BigDecimal total = new BigDecimal("0");

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
