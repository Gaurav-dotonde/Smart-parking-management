package com.parking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RefundListItemResponse(
        String refundId,
        Long bookingId,
        Long paymentId,
        String userName,
        String userEmail,
        String parkingLocation,
        String slotNumber,
        BigDecimal originalPaymentAmount,
        BigDecimal cancellationFee,
        BigDecimal refundAmount,
        String refundMethod,
        String paymentReference,
        String paymentMethod,
        String refundStatus,
        int attemptNumber,
        LocalDateTime requestedAt,
        LocalDateTime processedAt
) {}
