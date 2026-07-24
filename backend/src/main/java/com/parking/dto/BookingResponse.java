package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class BookingResponse {
    private Long id;
    private String slotNumber;
    private String lotName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private String paymentStatus;
    private String vehicleNumber;
    private String vehicleType;
    private Double amount;
    private LocalDateTime actualCheckInTime;
    private LocalDateTime actualCheckOutTime;
    private Boolean overstay;
    private Boolean extended;
    private Integer extensionCount;
    private LocalDateTime originalEndTime;
    private String lifecycleMessage;
}
