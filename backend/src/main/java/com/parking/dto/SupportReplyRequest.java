package com.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportReplyRequest(
        @NotBlank @Size(min = 1, max = 4000) String message
) {}
