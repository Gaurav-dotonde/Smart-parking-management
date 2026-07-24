package com.parking.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_extensions", indexes = {
    @Index(name = "idx_booking_extensions_booking_id", columnList = "booking_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingExtension {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false)
    private LocalDateTime previousEndTime;

    @Column(nullable = false)
    private LocalDateTime newEndTime;

    @Column(nullable = false)
    private Integer extraMinutes;

    @Column(nullable = false)
    private Double extraAmount;

    private String paymentReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExtendedBy extendedBy;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
