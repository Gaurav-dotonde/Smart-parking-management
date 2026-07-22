package com.parking.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Gateway-neutral request contract reserved for the future user payment flow.
 */
@Data
public class PaymentRequest {
    @NotNull
    private Long bookingId;
}
