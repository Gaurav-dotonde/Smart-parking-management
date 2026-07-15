package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ReportsBookingRowResponse {
    private Long bookingId;
    private String userName;
    private String slotNumber;
    private String vehicleNumber;
    private LocalDateTime bookingDate;
    private long durationHours;
    private String bookingStatus;
    private String paymentStatus;
    private double amount;
}
