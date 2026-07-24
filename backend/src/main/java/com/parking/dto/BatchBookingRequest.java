package com.parking.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public record BatchBookingRequest(
    @NotNull LocalDateTime startTime,
    @NotNull LocalDateTime endTime,
    @NotEmpty @Size(max=10) List<@Valid VehicleSlot> vehicles
) {
    public record VehicleSlot(
        @NotNull Long slotId,
        @NotBlank @Pattern(regexp="^[A-Z0-9- ]{4,20}$") String vehicleNumber,
        @NotBlank String vehicleType
    ) {}
}
