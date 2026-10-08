package com.zmartcredential.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "expiration_alert_config")
@Getter
@Setter
@NoArgsConstructor
public class ExpirationAlertConfig {

    @Id
    private Long orgId;

    private Boolean enabled = true;

    private Integer criticalDays = 7;

    private Integer warningDays = 30;

    private Integer infoDays = 90;

    private Boolean notifyEmail = true;

    private Boolean notifyDashboard = true;

    private String cadence = "daily";
}
