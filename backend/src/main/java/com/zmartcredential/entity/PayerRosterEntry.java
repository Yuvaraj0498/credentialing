package com.zmartcredential.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payer_roster_entry")
@Getter
@Setter
@NoArgsConstructor
public class PayerRosterEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long uploadId;

    private String npi;

    private String firstName;

    private String lastName;

    private String specialty;

    private String actionStatus = "none";
}
