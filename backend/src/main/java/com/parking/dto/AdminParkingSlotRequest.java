package com.parking.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminParkingSlotRequest {

    @NotNull
    private Long lotId;

    @NotBlank
    private String slotNumber;

    @NotNull
    @Min(0)
    @Max(100)
    private Integer floor;

    @NotBlank
    private String vehicleType;

    @NotBlank
    private String status;
}
