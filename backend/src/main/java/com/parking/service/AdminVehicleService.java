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
    private static final List<BookingStatus> OPEN_BOOKING_STATUSES = List.of(
            BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.RESERVED,
            BookingStatus.ACTIVE, BookingStatus.OCCUPIED, BookingStatus.PENDING_PAYMENT,
            BookingStatus.CONFIRMED);
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    public List<AdminVehicleResponse> list() {
        return vehicleRepository.findAllByArchivedFalseOrderByCreatedAtDesc().stream().map(this::response).toList();
    }
    public List<AdminVehicleResponse> listArchived() {
        return vehicleRepository.findAllByArchivedTrueOrderByArchivedAtDesc().stream().map(this::response).toList();
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
        Vehicle vehicle = findActiveRecord(id);
        if (vehicle.isActive() == active) {
            throw new IllegalStateException("Vehicle is already " + (active ? "active." : "inactive."));
        }
        if (!active && hasFutureBooking(vehicle)) {
            throw new IllegalStateException("This vehicle has a current or future booking and cannot be deactivated.");
        }
        vehicle.setActive(active);
        return response(vehicleRepository.save(vehicle));
    }

    @Transactional
    public AdminVehicleResponse archive(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Vehicle not found."));
        if (vehicle.isArchived()) throw new IllegalStateException("Vehicle is already archived.");
        if (hasFutureBooking(vehicle)) {
            throw new IllegalStateException("This vehicle has a current or future booking and cannot be archived.");
        }
        vehicle.setArchived(true);
        vehicle.setArchivedAt(LocalDateTime.now());
        return response(vehicleRepository.save(vehicle));
    }

    @Transactional
    public AdminVehicleResponse restore(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Vehicle not found."));
        if (!vehicle.isArchived()) throw new IllegalStateException("Vehicle is not archived.");
        vehicle.setArchived(false);
        vehicle.setArchivedAt(null);
        return response(vehicleRepository.save(vehicle));
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
    private Vehicle find(Long id) { return findActiveRecord(id); }
    private Vehicle findActiveRecord(Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Vehicle not found."));
        if (vehicle.isArchived()) throw new IllegalStateException("Vehicle is archived.");
        return vehicle;
    }
    private boolean hasFutureBooking(Vehicle vehicle) {
        String registration = vehicle.getRegistrationNormalized();
        LocalDateTime now = LocalDateTime.now();
        return bookingRepository.findByStatusInAndEndTimeAfter(OPEN_BOOKING_STATUSES, now).stream()
                .anyMatch(booking -> normalizeForLookup(booking.getVehicleNumber()).equals(registration));
    }
    private String normalizeRegistration(String value) { String normalized = value == null ? "" : value.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT); if (normalized.length() < 4) throw new IllegalArgumentException("Enter a valid registration number."); return normalized; }
    private String normalizeForLookup(String value) { return value == null ? "" : value.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT); }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private AdminVehicleResponse response(Vehicle v) { return new AdminVehicleResponse(v.getId(), v.getOwner().getId(), v.getOwner().getName(), v.getOwner().getEmail(), v.getRegistrationNumber(), v.getVehicleType(), v.getBrand(), v.getModel(), v.getColor(), v.isActive(), v.isArchived(), v.getArchivedAt(), v.getCreatedAt(), v.getUpdatedAt()); }
}
