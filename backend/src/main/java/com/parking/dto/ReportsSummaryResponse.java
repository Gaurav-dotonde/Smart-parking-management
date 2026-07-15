package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReportsSummaryResponse {
    private long totalBookings;
    private long completedBookings;
    private long cancelledBookings;
    private double totalRevenue;
    private double averageBookingAmount;
}
