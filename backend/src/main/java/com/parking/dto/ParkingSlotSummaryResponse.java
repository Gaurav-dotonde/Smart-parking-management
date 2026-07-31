package com.parking.dto;

import java.util.List;

public record ParkingSlotSummaryResponse(
        Long lotId,
        String lotName,
        long totalSlots,
        long available,
        long reserved,
        long booked,
        long maintenance,
        long disabled,
        List<FloorSummaryResponse> floors
) {}
