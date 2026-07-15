package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReportsBookingStatusResponse {
    private long activeBookings;
    private long completedBookings;
    private long cancelledBookings;
}
