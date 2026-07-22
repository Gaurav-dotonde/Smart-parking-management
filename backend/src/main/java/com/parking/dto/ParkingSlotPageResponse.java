package com.parking.dto;

import java.util.List;

public record ParkingSlotPageResponse(
        List<AdminParkingSlotResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {}
