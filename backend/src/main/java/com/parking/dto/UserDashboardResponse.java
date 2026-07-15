package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class UserDashboardResponse {
    private long activeBookings;
    private long upcomingBookings;
    private long completedBookings;
    private long cancelledBookings;
    private long totalPayments;
    private long pendingPayments;
    private List<BookingResponse> recentBookings;
}
