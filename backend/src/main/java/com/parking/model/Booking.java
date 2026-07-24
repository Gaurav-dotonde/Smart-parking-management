package com.parking.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = false)
    private ParkingSlot slot;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.ACTIVE;

    @Column(nullable = false)
    private Double amount;

    @Column
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    @Column
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime approvedAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime expiredAt;
    private LocalDateTime completedAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean overstay = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean extended = false;

    @Column(nullable = false)
    @Builder.Default
    private Integer extensionCount = 0;

    private LocalDateTime originalEndTime;

    @Column(length = 500)
    private String cancellationReason;
}
