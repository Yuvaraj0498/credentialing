package com.zmartcredential.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "enrollment_file")
@Getter
@Setter
@NoArgsConstructor
public class EnrollmentFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long enrollmentId;

    private String name;

    private String fileType = "other";

    private String storageKey;

    private String mimeType;

    private Long sizeBytes;

    private LocalDateTime uploadedAt;

    private Long uploadedBy;
}
