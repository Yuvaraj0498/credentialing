package com.zmartcredential.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payer_form_field")
@Getter
@Setter
@NoArgsConstructor
public class PayerFormField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long formId;

    private String sectionName;

    private String label;

    private String mapsTo;

    private String confidence = "high";

    private Integer sortOrder = 0;
}
