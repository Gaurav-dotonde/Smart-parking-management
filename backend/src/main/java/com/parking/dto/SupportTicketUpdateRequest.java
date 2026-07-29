package com.parking.dto;

import jakarta.validation.constraints.Size;

public record SupportTicketUpdateRequest(
        @Size(max = 30) String status,
        @Size(max = 20) String priority,
        Long assignedToId,
        @Size(max = 4000) String internalNotes
) {}
