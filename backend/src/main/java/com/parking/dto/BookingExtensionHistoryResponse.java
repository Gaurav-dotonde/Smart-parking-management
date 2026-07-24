package com.parking.dto;

import java.time.LocalDateTime;

public record BookingExtensionHistoryResponse(
        Long id,
        LocalDateTime previousEndTime,
        LocalDateTime newEndTime,
        Integer extraMinutes,
        Double extraAmount,
        String paymentReference,
        String extendedBy,
        LocalDateTime extendedAt
) {}
