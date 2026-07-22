package com.parking.dto;

public record FloorSummaryResponse(
        Integer floor,
        String floorName,
        long total,
        long available,
        long reserved,
        long booked,
        long occupied,
        long maintenance,
        long disabled
) {}
