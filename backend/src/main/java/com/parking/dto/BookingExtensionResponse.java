package com.parking.dto;

import java.time.LocalDateTime;

public record BookingExtensionResponse(
        BookingResponse booking,
        LocalDateTime previousEndTime,
        LocalDateTime newEndTime,
        Integer extraMinutes,
        Double additionalAmount,
        Boolean paymentRequired,
        String updatedStatus
) {}
