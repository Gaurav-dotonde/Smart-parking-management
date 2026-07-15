package com.parking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class AdminUserResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String role;
    private long totalBookings;
    private String accountStatus;
    private LocalDateTime createdDate;
}
