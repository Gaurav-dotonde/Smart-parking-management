package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class AdminUserDetailsResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String role;
    private String accountStatus;
    private long totalBookings;
    private LocalDateTime createdDate;
    private List<AdminUserRecentBookingResponse> recentBookings;
}
