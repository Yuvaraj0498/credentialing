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

    /** null = every organization; otherwise only this organization's providers list it */
    private Long orgId;

    private Long createdByOrgId;

    private Boolean active = true;

    private Boolean deleted = false;

    /** the standard types (can't be deleted) */
    private Boolean builtIn = false;

    /** Listed for an organization's providers: the standard types plus the organization's own, switched on. */
    public boolean visibleFor(Long org) {
        if (Boolean.TRUE.equals(deleted) || Boolean.FALSE.equals(active)) return false;
        return orgId == null || orgId.equals(org);
    }
}
