package com.zmartcredential.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payer_form")
@Getter
@Setter
@NoArgsConstructor
public class PayerForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long payerId;

    private String code;

    private String label;

    private String description;

    private Integer sortOrder = 0;
}
