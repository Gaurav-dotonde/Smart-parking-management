package com.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminVehicleRequest {
    @NotNull private Long ownerId;
    @NotBlank private String registrationNumber;
    @NotBlank private String vehicleType;
    private String brand;
    private String model;
    private String color;
    private Boolean active;
}
