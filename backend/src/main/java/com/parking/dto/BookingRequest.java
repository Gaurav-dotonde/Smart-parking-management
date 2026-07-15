package com.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookingRequest {
    @NotNull
    private Long slotId;

    @NotNull
    private LocalDateTime startTime;

    @NotNull
    private LocalDateTime endTime;

    @NotBlank(message = "Vehicle number is required.")
    @Pattern(regexp = "^[A-Z0-9- ]{4,20}$", message = "Vehicle number format is invalid.")
    private String vehicleNumber;

    @NotBlank(message = "Vehicle type is required.")
    private String vehicleType;
}
