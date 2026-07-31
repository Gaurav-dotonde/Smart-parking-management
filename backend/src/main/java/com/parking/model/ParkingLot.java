package com.parking.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "parking_lots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String location;

    @Column
    private String address;

    @Column
    private String area;

    @Column
    private String city;

    @Column
    private String state;

    @Column(name = "pin_code")
    private String pinCode;

    @Column(precision = 10, scale = 7)
    private java.math.BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private java.math.BigDecimal longitude;

    @Column(nullable = false)
    private Integer totalSlots;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalFloors = 0;

    @Column(nullable = false) @Builder.Default private Integer availableSlots = 0;
    @JsonIgnore
    @Column(nullable = false) @Builder.Default private Integer occupiedSlots = 0;
    @Column(nullable = false) @Builder.Default private Integer bookedSlots = 0;
    @Column(nullable = false) @Builder.Default private Integer reservedSlots = 0;
    @Column(nullable = false) @Builder.Default private Integer maintenanceSlots = 0;
    @Column(nullable = false) @Builder.Default private Integer disabledSlots = 0;

    @Column(name = "price_per_hour", nullable = false)
    private Double pricePerDay;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean archived = false;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column
    private LocalTime openingTime;

    @Column
    private LocalTime closingTime;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @JsonIgnore
    @OneToMany(mappedBy = "parkingLot", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ParkingSlot> slots = new java.util.ArrayList<>();

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getStatus() {
        return Boolean.TRUE.equals(archived) ? "ARCHIVED" : Boolean.TRUE.equals(active) ? "ACTIVE" : "INACTIVE";
    }
}
