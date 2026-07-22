package com.parking.service;

import com.parking.dto.*;
import com.parking.model.*;
import com.parking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class AdminVehicleService {
    private static final Set<String> TYPES = Set.of("TWO_WHEELER", "CAR", "SUV", "COMMERCIAL");
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    public List<AdminVehicleResponse> list() {
        return vehicleRepository.findAllByArchivedFalseOrderByCreatedAtDesc().stream().map(this::response).toList();
    }
    public AdminVehicleResponse get(Long id) { return response(find(id)); }

    @Transactional
    public AdminVehicleResponse create(AdminVehicleRequest request) {
        String normalized = normalizeRegistration(request.getRegistrationNumber());
        if (vehicleRepository.existsByRegistrationNormalized(normalized)) throw new IllegalArgumentException("Vehicle registration number already exists.");
        Vehicle vehicle = new Vehicle();
        apply(vehicle, request, normalized);
        return response(vehicleRepository.save(vehicle));
    }

    @Transactional
    public AdminVehicleResponse update(Long id, AdminVehicleRequest request) {
        Vehicle vehicle = find(id);
        String normalized = normalizeRegistration(request.getRegistrationNumber());
        if (vehicleRepository.existsByRegistrationNormalizedAndIdNot(normalized, id)) throw new IllegalArgumentException("Vehicle registration number already exists.");
        apply(vehicle, request, normalized);
        return response(vehicleRepository.save(vehicle));
    }

    @Transactional
    public AdminVehicleResponse status(Long id, boolean active) {
        Vehicle vehicle = find(id); vehicle.setActive(active); return response(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void archive(Long id) {
        Vehicle vehicle = find(id); vehicle.setArchived(true); vehicle.setActive(false); vehicle.setArchivedAt(LocalDateTime.now()); vehicleRepository.save(vehicle);
    }

    private void apply(Vehicle vehicle, AdminVehicleRequest request, String normalized) {
        User owner = userRepository.findById(request.getOwnerId()).orElseThrow(() -> new IllegalArgumentException("Vehicle owner not found."));
        String type = request.getVehicleType().trim().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) throw new IllegalArgumentException("Unsupported vehicle type.");
        vehicle.setOwner(owner); vehicle.setRegistrationNumber(request.getRegistrationNumber().trim().toUpperCase(Locale.ROOT));
        vehicle.setRegistrationNormalized(normalized); vehicle.setVehicleType(type); vehicle.setBrand(clean(request.getBrand()));
        vehicle.setModel(clean(request.getModel())); vehicle.setColor(clean(request.getColor()));
        if (request.getActive() != null) vehicle.setActive(request.getActive());
    }
    private Vehicle find(Long id) { return vehicleRepository.findById(id).filter(v -> !v.isArchived()).orElseThrow(() -> new IllegalArgumentException("Vehicle not found.")); }
    private String normalizeRegistration(String value) { String normalized = value == null ? "" : value.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT); if (normalized.length() < 4) throw new IllegalArgumentException("Enter a valid registration number."); return normalized; }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private AdminVehicleResponse response(Vehicle v) { return new AdminVehicleResponse(v.getId(), v.getOwner().getId(), v.getOwner().getName(), v.getOwner().getEmail(), v.getRegistrationNumber(), v.getVehicleType(), v.getBrand(), v.getModel(), v.getColor(), v.isActive(), v.getCreatedAt(), v.getUpdatedAt()); }
}
