package com.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RefundRetryRequest(
        @NotBlank(message = "Retry reason is required.")
        @Size(max = 500, message = "Retry reason must be 500 characters or fewer.")
        String reason
) {}
