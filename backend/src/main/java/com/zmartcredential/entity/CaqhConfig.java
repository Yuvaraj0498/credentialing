package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "caqh_config")
@Getter
@Setter
@NoArgsConstructor
public class CaqhConfig {

    @Id
    private Long orgId;

    private String path = "csv";

    private String directUsername;

    private String directPasswordEnc;

    private String directOrgId;

    private String directEnvironment;

    private String aggregatorVendor;

    private String aggregatorApiKeyEnc;

    private String aggregatorBaseUrl;

    /** Provider lookup for "Import from CAQH": mock (built-in demo profiles) | real (GET {lookupApiUrl}/providers/{caqhId}). */
    private String lookupMode = "mock";

    private String lookupApiUrl;

    private String lookupApiKeyEnc;

    private String lookupOrgId;

    private Boolean syncEnabled = false;

    private String syncCadence = "weekly";

    private String syncDayOfWeek = "sunday";

    private Integer syncHour = 2;

    private Boolean syncOnlyAttested = true;

    private Boolean syncNotifyChanges = true;

    private Integer syncRateLimit = 60;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
