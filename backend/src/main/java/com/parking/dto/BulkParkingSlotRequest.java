package com.parking.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BulkParkingSlotRequest {
    @NotBlank private String prefix;
    @NotNull @Min(0) private Integer startingNumber;
    @NotNull @Min(1) @Max(500) private Integer count;
    @NotNull @Min(0) @Max(3) private Integer floor;
    private String zone;
    @NotBlank private String vehicleType;
    @NotBlank private String slotType;
    @NotBlank private String defaultStatus;
    @Min(0) private Double priceOverride;
}
