package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "pricing_state")
@Getter
@Setter
@NoArgsConstructor
public class PricingState {

    @Id
    private String code;

    private String name;

    private BigDecimal mult;

    private String region;
}
