package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** One value of a Master Data list (a dropdown). org_id null = everyone; deleting marks it deleted. */
@Entity
@Table(name = "master_list_item")
@org.hibernate.annotations.SoftDelete(columnName = "is_deleted")
@Getter
@Setter
@NoArgsConstructor
public class MasterListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String listKey;

    /** stored value of code-based lists (Organization Type); null = the value itself is stored */
    private String code;

    private String value;

    private Integer sortOrder = 0;

    private Boolean active = true;

    private Long orgId;

    private Long createdByOrgId;

    private Long createdBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
