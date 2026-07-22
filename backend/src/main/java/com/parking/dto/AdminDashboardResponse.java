package com.parking.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AdminDashboardResponse(
        long totalParkingLocations,
        long totalParkingSlots,
        long availableSlots,
        long bookedSlots,
        long reservedSlots,
        long occupiedSlots,
        long maintenanceSlots,
        long disabledSlots,
        long totalUsers,
        long totalVehicles,
        long activeBookings,
        long completedBookings,
        long cancelledBookings,
        long todayBookings,
        BigDecimal totalRevenue,
        List<AdminBookingResponse> recentBookings,
        List<RecentUser> recentUsers,
        List<RecentPayment> recentPayments,
        List<LocationOccupancy> locationOccupancy,
        List<RevenuePoint> revenueOverview
) {
    public record RecentUser(Long id, String name, String email, String accountStatus, LocalDateTime createdAt) {}

    public record RecentPayment(
            Long bookingId,
            String transactionReference,
            String userName,
            String vehicleNumber,
            BigDecimal amount,
            String paymentStatus,
            LocalDateTime paymentDate
    ) {}

    public record LocationOccupancy(
            Long locationId,
            String locationName,
            long totalSlots,
            long availableSlots,
            long unavailableSlots,
            double occupancyPercentage
    ) {}

    public record RevenuePoint(LocalDate date, BigDecimal amount) {}
}
