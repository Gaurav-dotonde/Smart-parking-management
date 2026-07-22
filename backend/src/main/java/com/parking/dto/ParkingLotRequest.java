package com.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Max;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonAlias;

import java.time.LocalTime;

@Data
public class ParkingLotRequest {
    @NotBlank
    private String name;

    private String location;

    private String address;
    private String area;
    @NotBlank
    private String city;
    private String state;
    private String pinCode;
    @NotNull(message = "Total capacity is required.")
    @Positive(message = "Total capacity must be greater than zero.")
    @Max(value = 10000, message = "Total capacity must be 10000 or less.")
    @JsonAlias("totalCapacity")
    private Integer totalSlots;

    @NotNull(message = "Price per day is required.")
    @Positive(message = "Price per day must be greater than zero.")
    @JsonAlias("pricePerHour")
    private Double pricePerDay;

    private Boolean active = Boolean.TRUE;

    private Boolean archived = Boolean.FALSE;

    @NotNull
    private LocalTime openingTime;

    @NotNull
    private LocalTime closingTime;
}
