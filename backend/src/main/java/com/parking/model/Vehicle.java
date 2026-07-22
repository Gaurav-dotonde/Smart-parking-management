package com.parking.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles", uniqueConstraints = @UniqueConstraint(name = "uk_vehicle_registration_normalized", columnNames = "registration_normalized"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vehicle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "registration_number", nullable = false, length = 30)
    private String registrationNumber;

    @Column(name = "registration_normalized", nullable = false, length = 30)
    private String registrationNormalized;

    @Column(name = "vehicle_type", nullable = false, length = 30)
    private String vehicleType;
    private String brand;
    private String model;
    private String color;

    @Column(nullable = false) @Builder.Default
    private boolean active = true;
    @Column(nullable = false) @Builder.Default
    private boolean archived = false;
    @Column(name = "created_at", nullable = false, updatable = false) @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @PrePersist void create() { if (createdAt == null) createdAt = LocalDateTime.now(); }
    @PreUpdate void update() { updatedAt = LocalDateTime.now(); }
}
