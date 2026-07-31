package com.parking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RefundDetailResponse(
        String refundId,
        Long paymentId,
        Long bookingId,
        String userName,
        String userEmail,
        String parkingLocation,
        String slotNumber,
        LocalDateTime bookingStartTime,
        LocalDateTime bookingEndTime,
        LocalDateTime bookingCancelledAt,
        String cancellationReason,
        BigDecimal originalPaymentAmount,
        BigDecimal cancellationFee,
        BigDecimal refundAmount,
        String currency,
        String paymentMethod,
        String refundMethod,
        String paymentReference,
        String refundStatus,
        int attemptNumber,
        String requestedBy,
        String failureReason,
        String retryReason,
        LocalDateTime requestedAt,
        LocalDateTime initiatedAt,
        LocalDateTime processingAt,
        LocalDateTime completedAt,
        LocalDateTime failedAt,
        List<RefundTimelineItem> timeline,
        List<RefundAttemptItem> attempts
) {
    public record RefundTimelineItem(String status, LocalDateTime timestamp, String message) {}
    public record RefundAttemptItem(String refundId, int attemptNumber, String status, BigDecimal amount,
                                    LocalDateTime requestedAt, LocalDateTime completedAt, LocalDateTime failedAt) {}
}
