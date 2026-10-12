package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

/** "Use this template": the template an organization uses for one email type. */
@Entity
@Table(name = "org_email_template_choice")
@Getter
@Setter
@NoArgsConstructor
public class OrgEmailTemplateChoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String type;

    private Long templateId;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
