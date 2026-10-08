package com.zmartcredential.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "document_type")
@Getter
@Setter
@NoArgsConstructor
public class DocumentType {

    @Id
    private String code;

    private String label;

    private Boolean critical = false;

    private Boolean expires = false;

    private Integer monthsValid;

    private Boolean naForUs = false;

    private Integer sortOrder = 0;
}
