package com.parking.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserProfileUpdateRequest {
    @Size(max = 120, message = "Name must be 120 characters or fewer")
    private String name;

    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be valid.")
    private String phone;

    @Size(max = 30, message = "Vehicle number must be 30 characters or fewer")
    private String vehicleNumber;
}
