package com.parking.dto;

public record ParkingSlotResponse(
        Long id,
        Long parkingLotId,
        String parkingLotName,
        String slotNumber,
        Integer floor,
        String vehicleType,
        String status,
        Long version
) {}
