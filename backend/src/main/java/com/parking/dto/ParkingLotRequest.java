package com.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalTime;

@Data
public class ParkingLotRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String location;

    @NotNull @Positive
    private Integer totalSlots;

    @NotNull @Positive
    private Double pricePerHour;

    private Boolean active = Boolean.TRUE;

    private LocalTime openingTime;

    private LocalTime closingTime;
}
