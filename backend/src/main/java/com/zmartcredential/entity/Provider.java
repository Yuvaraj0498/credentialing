package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "provider")
@Getter
@Setter
@NoArgsConstructor
/** Deleting marks the row deleted (is_deleted = 1); deleted rows are left out of every query. */
@org.hibernate.annotations.SoftDelete(columnName = "is_deleted")
public class Provider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String firstName;

    private String lastName;

    private String suffix;

    private String specialty;

    private String practitionerType;

    private String taxonomyCode;

    private String gender;

    private String ethnicity;

    private LocalDate dateOfBirth;

    private String npi;

    private String email;

    private String phone;

    private String licenseNumber;

    private String licenseState;

    private LocalDate licenseExpires;

    private String deaNumber;

    private LocalDate deaExpires;

    private String boardCert;

    private String malpracticeCarrier;

    private String caqhId;

    private String caqhUsername;

    /** AES-encrypted CAQH ProView password (never returned by the API). */
    private String caqhPasswordEnc;

    private Boolean pecosAccessGranted;

    private String pecosUsername;

    private LocalDate caqhLastAttested;

    private LocalDateTime caqhLastSynced;

    private String caqhAttestationStatus;

    private Long clientId;

    private Long practiceId;

    private Long locationId;

    private String status = "draft";

    private Boolean telemed = false;

    private String source = "manual";

    private LocalDate dateAdded;

    @Column(name = "is_self_signup")
    private Boolean selfSignup = false;

    @Column(name = "is_test_data")
    private Boolean testData = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ---- more provider details (Add Provider / secure link; all optional) ----

    private String groupName;

    private String groupNpi;

    private String taxId;

    private String ssnEnc;

    private String homeAddress;

    private String homeCity;

    private String homeState;

    private String homeZip;

    private String medicarePhone;

    private String medicaidNumber;

    private String medicarePtan;

    private String drivingLicense;

    private String pecosPasswordEnc;

    private String practiceLegalName;

    private String practiceDbaName;

    private String practiceOwnerName;

    private String practiceManagerName;

    private String practiceManagerContact;

    private String practiceAddress;

    private String practiceCity;

    private String practiceState;

    private String practiceZip;

    private String practicePhone;

    private String practiceFax;

    private String practiceEmail;

    private LocalDate practiceStartDate;

    private String officeHours;

    private String billingAddress;

    private String billingCity;

    private String billingState;

    private String billingZip;

    private String billingPhone;

    private String billingFax;

    private String billingEmail;

    private String billingContactPerson;

    /** 0 while the row is live; the row's id once deleted, so its unique values can be used again. */
    private Long delToken = 0L;
}
