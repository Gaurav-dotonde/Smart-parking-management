package com.parking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Gateway-neutral payment response. Gateway identifiers will be added only
 * when a provider is selected.
 */
public record PaymentResponse(
        Long id,
        Long bookingId,
        BigDecimal amount,
        String currency,
        String paymentMethod,
        String paymentStatus,
        String transactionReference,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) { }
