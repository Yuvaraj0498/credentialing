package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "client")
@Getter
@Setter
@NoArgsConstructor
/** Deleting marks the row deleted (is_deleted = 1); deleted rows are left out of every query. */
@org.hibernate.annotations.SoftDelete(columnName = "is_deleted")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private String name;

    @Column(name = "is_test_data")
    private Boolean testData = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
