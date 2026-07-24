package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AdminBookingResponse {
    private Long id;
    private String userName;
    private String email;
    private String parkingLot;
    private String slotNumber;
    private Integer floor;
    private String vehicleNumber;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String bookingStatus;
    private String paymentStatus;
    private Double amount;
    private LocalDateTime actualCheckInTime;
    private LocalDateTime actualCheckOutTime;
    private Boolean overstay;
    private Boolean extended;
    private Integer extensionCount;
    private String lifecycleMessage;
}
