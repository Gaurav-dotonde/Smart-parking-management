package com.parking.dto;

public record SupportSummaryResponse(
        long totalTickets,
        long open,
        long inProgress,
        long waitingForUser,
        long resolved,
        long closed,
        long todayTickets,
        long urgent,
        long unassigned,
        long cancelled
) {}
