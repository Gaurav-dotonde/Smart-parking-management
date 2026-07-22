package com.parking.dto;

import java.time.LocalDateTime;

public record AdminParkingSlotResponse(
        Long id, Long lotId, String lotName, Long parkingLotId, String parkingLotName,
        String lotAddress, String slotNumber,
        Integer floor, String zone, String vehicleType, String slotType,
        Double pricePerDay, Double priceOverride, String status,
        Boolean evChargingAvailable, Boolean accessibleSlot, String notes,
        Boolean archived, LocalDateTime createdAt, LocalDateTime updatedAt, Long version,
        Long currentBookingId, String currentUser, String currentUserEmail,
        String currentVehicleNumber, LocalDateTime bookingStartTime, LocalDateTime bookingEndTime
) {}
