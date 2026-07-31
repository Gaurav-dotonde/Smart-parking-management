package com.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportResolveRequest(
        @NotBlank @Size(max = 4000) String resolutionSummary,
        @Size(max = 4000) String reply
) {}
