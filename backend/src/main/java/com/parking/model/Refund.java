package com.parking.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refunds", indexes = {
        @Index(name = "idx_refund_user_status", columnList = "user_id,status"),
        @Index(name = "idx_refund_booking", columnList = "booking_id"),
        @Index(name = "idx_refund_payment", columnList = "payment_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_refund_public_id", columnNames = "public_refund_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Refund {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_refund_id", nullable = false, updatable = false, length = 40)
    private String publicRefundId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber;

    @Column(name = "original_payment_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal originalPaymentAmount;

    @Column(name = "requested_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal requestedAmount;

    @Column(name = "cancellation_fee", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal cancellationFee = BigDecimal.ZERO;

    @Column(name = "approved_refund_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal approvedRefundAmount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "refund_method", nullable = false)
    private String refundMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RefundStatus refundStatus;

    @Column(name = "transaction_reference")
    private String transactionReference;

    @Column(name = "gateway_refund_id", unique = true)
    private String gatewayRefundId;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "initiated_at")
    private LocalDateTime initiatedAt;

    @Column(name = "processing_at")
    private LocalDateTime processingAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "requested_by", nullable = false, length = 30)
    private String requestedBy;

    @Column(name = "retry_reason", length = 500)
    private String retryReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    @PrePersist
    void create() {
        LocalDateTime now = LocalDateTime.now();
        if (requestedAt == null) requestedAt = now;
        if (createdAt == null) createdAt = now;
    }

    @PreUpdate
    void update() {
        updatedAt = LocalDateTime.now();
    }
}
