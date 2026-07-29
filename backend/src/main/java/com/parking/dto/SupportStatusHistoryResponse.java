package com.parking.dto;

import java.time.LocalDateTime;

public record SupportStatusHistoryResponse(
        Long id,
        String previousStatus,
        String newStatus,
        String changedByName,
        String changedByRole,
        String note,
        LocalDateTime createdAt
) {}
