package com.zmartcredential.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "package_feature")
@Getter
@Setter
@NoArgsConstructor
public class PackageFeature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String packageCode;

    private String label;

    private Boolean included = true;

    private Integer sortOrder = 0;
}
