package com.parking.dto;

import java.time.LocalDateTime;

public record AdminVehicleResponse(Long id, Long ownerId, String ownerName, String ownerEmail,
        String registrationNumber, String vehicleType, String brand, String model, String color,
        boolean active, LocalDateTime createdAt, LocalDateTime updatedAt) { }
