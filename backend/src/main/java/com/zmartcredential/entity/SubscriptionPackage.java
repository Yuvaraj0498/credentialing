package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "subscription_package")
@Getter
@Setter
@NoArgsConstructor
public class SubscriptionPackage {

    @Id
    private String code;

    private String name;

    private BigDecimal basePrice;

    private BigDecimal perProvider;

    private String color;

    private String colorSoft;

    private Boolean recommended = false;

    private Integer providerCap;

    private Integer payerCap;

    private Integer aiUploadsPerMonth;

    private String primarySupport;

    private Integer sortOrder = 0;

    private Boolean active = true;
}
