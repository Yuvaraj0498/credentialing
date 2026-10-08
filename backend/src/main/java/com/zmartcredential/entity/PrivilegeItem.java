package com.zmartcredential.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "privilege_item")
@Getter
@Setter
@NoArgsConstructor
public class PrivilegeItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String categoryCode;

    private String name;

    private Integer sortOrder = 0;
}
