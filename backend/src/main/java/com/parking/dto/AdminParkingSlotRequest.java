package com.parking.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminParkingSlotRequest {

    private Long lotId;

    @NotBlank
    private String slotNumber;

    @NotNull
    @Min(0)
    @Max(3)
    private Integer floor;

    @NotBlank
    private String vehicleType;

    @NotBlank
    private String status;

    private String zone;

    @NotBlank
    private String slotType = "STANDARD";

    @Min(0)
    private Double priceOverride;

    private Boolean evChargingAvailable = false;
    private Boolean accessibleSlot = false;
    private String notes;
}
