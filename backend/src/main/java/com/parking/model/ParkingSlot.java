package com.parking.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parking_slots", uniqueConstraints = @UniqueConstraint(name = "uk_slot_lot_number", columnNames = {"lot_id", "slot_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Column(nullable = false)
    private String slotNumber;

    @Column(nullable = false)
    private Integer floor;

    @Column(nullable = false)
    @Builder.Default
    private String vehicleType = "Car";

    @Column
    private String zone;

    @Column(name = "slot_type", nullable = false)
    @Builder.Default
    private String slotType = "STANDARD";

    @Column(name = "price_override")
    private Double priceOverride;

    @Column(name = "ev_charging_available", nullable = false)
    @Builder.Default
    private Boolean evChargingAvailable = false;

    @Column(name = "accessible_slot", nullable = false)
    @Builder.Default
    private Boolean accessibleSlot = false;

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private Boolean archived = false;

    @Column(name = "archived_at")
    private java.time.LocalDateTime archivedAt;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private java.time.LocalDateTime updatedAt = java.time.LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SlotStatus status = SlotStatus.AVAILABLE;

    // Optimistic locking as an extra safety net alongside pessimistic row locks
    @Version
    private Long version;

    @PreUpdate
    void onUpdate() { updatedAt = java.time.LocalDateTime.now(); }
}
