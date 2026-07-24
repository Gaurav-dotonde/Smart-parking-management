package com.parking.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record BookingExtensionRequest(
        @NotNull @Future LocalDateTime newEndTime,
        @Min(1) Integer extensionMinutes,
        String paymentReference
) {}
