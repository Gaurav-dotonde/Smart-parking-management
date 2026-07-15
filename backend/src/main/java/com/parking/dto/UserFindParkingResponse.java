package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserFindParkingResponse {
    private Long slotId;
    private Long lotId;
    private String lotName;
    private String slotNumber;
    private Integer floor;
    private String vehicleType;
    private String status;
    private Double pricePerHour;
    private Long durationMinutes;
    private Double estimatedPrice;
}
