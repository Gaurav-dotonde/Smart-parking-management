package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AdminUserRecentBookingResponse {
    private Long bookingId;
    private String slotNumber;
    private String vehicleNumber;
    private String bookingStatus;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
