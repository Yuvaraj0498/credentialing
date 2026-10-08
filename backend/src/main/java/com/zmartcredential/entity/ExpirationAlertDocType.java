package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "expiration_alert_doc_type")
@IdClass(ExpirationAlertDocType.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class ExpirationAlertDocType {

    @Id
    private Long orgId;

    @Id
    private String docType;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long orgId;
        private String docType;
    }
}
