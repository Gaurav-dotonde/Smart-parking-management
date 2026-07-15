package com.parking.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parking_slots")
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SlotStatus status = SlotStatus.AVAILABLE;

    // Optimistic locking as an extra safety net alongside pessimistic row locks
    @Version
    private Long version;
}
