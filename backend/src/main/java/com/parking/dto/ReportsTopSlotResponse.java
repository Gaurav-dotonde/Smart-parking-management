package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReportsTopSlotResponse {
    private long rank;
    private String slotNumber;
    private Integer floor;
    private String vehicleType;
    private long totalBookings;
    private double totalRevenue;
}
