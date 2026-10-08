package com.zmartcredential.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "privilege_category")
@Getter
@Setter
@NoArgsConstructor
public class PrivilegeCategory {

    @Id
    private String code;

    private String name;
}
