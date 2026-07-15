package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReportsRevenueResponse {
    private double dailyRevenue;
    private double weeklyRevenue;
    private double monthlyRevenue;
}
