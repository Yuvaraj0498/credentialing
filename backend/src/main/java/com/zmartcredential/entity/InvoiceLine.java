package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "invoice_line")
@Getter
@Setter
@NoArgsConstructor
public class InvoiceLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long invoiceId;

    private String lineType;

    private String description;

    private String packageCode;

    private BigDecimal basePrice;

    private BigDecimal perProvider;

    private Integer providerCount;

    private LocalDate periodStart;

    private LocalDate periodEnd;

    private Long providerId;

    private String providerName;

    private Long payerId;

    private String payerName;

    private String stateCode;

    private String serviceType;

    private BigDecimal amount;

    private Integer sortOrder = 0;
}
