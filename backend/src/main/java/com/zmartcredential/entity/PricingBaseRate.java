package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "pricing_base_rate")
@IdClass(PricingBaseRate.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class PricingBaseRate {

    @Id
    private String category;

    @Id
    private String serviceType;

    private BigDecimal amount;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private String category;
        private String serviceType;
    }
}
