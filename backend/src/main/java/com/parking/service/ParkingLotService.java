package com.parking.service;

import com.parking.dto.AdminParkingSlotRequest;
import com.parking.dto.AdminParkingSlotResponse;
import com.parking.dto.ParkingLotRequest;
import com.parking.dto.UserFindParkingQuery;
import com.parking.dto.UserFindParkingResponse;
import com.parking.model.BookingStatus;
import com.parking.model.ParkingLot;
import com.parking.model.ParkingSlot;
import com.parking.model.SlotStatus;
import com.parking.repository.BookingRepository;
import com.parking.repository.ParkingLotRepository;
import com.parking.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParkingLotService {

    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final BookingRepository bookingRepository;

    @Transactional
    public ParkingLot createLot(ParkingLotRequest request) {
        ParkingLotRequest safeRequest = Objects.requireNonNull(request, "request must not be null");
        String name = normalizeLotName(safeRequest.getName());
        String location = normalizeLotLocation(safeRequest.getLocation());
        if (parkingLotRepository.existsByNameIgnoreCaseAndLocationIgnoreCase(name, location)) {
            throw new IllegalStateException("A parking lot with this name and location already exists.");
        }

        ParkingLot lot = ParkingLot.builder()
                .name(name)
                .location(location)
                .totalSlots(safeRequest.getTotalSlots())
                .pricePerHour(safeRequest.getPricePerHour())
                .active(safeRequest.getActive() == null || safeRequest.getActive())
                .openingTime(safeRequest.getOpeningTime())
                .closingTime(safeRequest.getClosingTime())
                .build();

        lot = parkingLotRepository.save(Objects.requireNonNull(lot, "lot must not be null"));

        // Auto-generate slots, one floor per 20 slots for a simple visual layout
        for (int i = 1; i <= safeRequest.getTotalSlots(); i++) {
            int floor = (i - 1) / 20 + 1;
            ParkingSlot slot = ParkingSlot.builder()
                    .parkingLot(lot)
                    .slotNumber("S" + i)
                    .floor(floor)
                    .vehicleType("Car")
                    .status(SlotStatus.AVAILABLE)
                    .build();
            parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null"));
        }

        return lot;
    }

    public List<ParkingLot> getAllLots() {
        return parkingLotRepository.findAll();
    }

    public List<ParkingLot> getActiveLots() {
        return parkingLotRepository.findByActiveTrueOrderByCreatedAtDesc();
    }

    public ParkingLot getLotById(Long id) {
        return parkingLotRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Parking lot not found"));
    }

    @Transactional
    public ParkingLot updateLot(Long id, ParkingLotRequest request) {
        ParkingLot lot = getLotById(Objects.requireNonNull(id, "id must not be null"));
        ParkingLotRequest safeRequest = Objects.requireNonNull(request, "request must not be null");
        String name = normalizeLotName(safeRequest.getName());
        String location = normalizeLotLocation(safeRequest.getLocation());
        if (parkingLotRepository.existsByNameIgnoreCaseAndLocationIgnoreCaseAndIdNot(
                name, location, lot.getId())) {
            throw new IllegalStateException("A parking lot with this name and location already exists.");
        }

        lot.setName(name);
        lot.setLocation(location);
        lot.setPricePerHour(safeRequest.getPricePerHour());
        lot.setActive(safeRequest.getActive() == null || safeRequest.getActive());
        lot.setOpeningTime(safeRequest.getOpeningTime());
        lot.setClosingTime(safeRequest.getClosingTime());
        reconcileLotSlots(lot, safeRequest.getTotalSlots());

        return parkingLotRepository.save(lot);
    }

    public List<ParkingSlot> getSlotsByLot(Long lotId) {
        return parkingSlotRepository.findByParkingLotId(Objects.requireNonNull(lotId, "lotId must not be null"));
    }

    public List<AdminParkingSlotResponse> getAdminSlotsByLot(Long lotId) {
        Long id = Objects.requireNonNull(lotId, "lotId must not be null");
        getLotById(id);
        return parkingSlotRepository.findByParkingLotId(id)
                .stream()
                .map(this::toAdminSlotResponse)
                .toList();
    }

    public List<UserFindParkingResponse> findAvailableSlots(UserFindParkingQuery query) {
        UserFindParkingQuery safeQuery = Objects.requireNonNull(query, "query must not be null");

        LocalDate date = LocalDate.parse(safeQuery.getDate());
        LocalTime start = LocalTime.parse(safeQuery.getStartTime());
        LocalTime end = LocalTime.parse(safeQuery.getEndTime());
        LocalDateTime startDateTime = LocalDateTime.of(date, start);
        LocalDateTime endDateTime = LocalDateTime.of(date, end);

        if (!endDateTime.isAfter(startDateTime)) {
            throw new IllegalArgumentException("End time must be greater than start time.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (date.isBefore(now.toLocalDate()) || startDateTime.isBefore(now) || endDateTime.isBefore(now)) {
            throw new IllegalArgumentException("Past date and time are not allowed.");
        }

        Integer requestedFloor = parseFloorFilter(safeQuery.getFloor());
        String requestedVehicleType = normalizeFilter(safeQuery.getVehicleType());

        List<BookingStatus> activeStatuses = List.of(BookingStatus.PENDING, BookingStatus.ACTIVE);

        return parkingSlotRepository.findAll()
                .stream()
                .filter(slot -> slot.getParkingLot() != null && Boolean.TRUE.equals(slot.getParkingLot().getActive()))
                .filter(slot -> slot.getStatus() == SlotStatus.AVAILABLE)
                .filter(slot -> requestedFloor == null || requestedFloor.equals(slot.getFloor()))
                .filter(slot -> matchesVehicleType(slot.getVehicleType(), requestedVehicleType))
                .filter(slot -> !bookingRepository.existsBySlotIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                        slot.getId(), activeStatuses, endDateTime, startDateTime
                ))
                .map(slot -> toUserFindParkingResponse(slot, startDateTime, endDateTime))
                .collect(Collectors.toList());
    }

    @Transactional
    public AdminParkingSlotResponse createSlot(AdminParkingSlotRequest request) {
        AdminParkingSlotRequest safeRequest = Objects.requireNonNull(request, "request must not be null");
        ParkingLot lot = getLotById(safeRequest.getLotId());
        String slotNumber = normalizeSlotNumber(safeRequest.getSlotNumber());

        if (parkingSlotRepository.existsByParkingLotIdAndSlotNumberIgnoreCase(lot.getId(), slotNumber)) {
            throw new IllegalStateException("A slot with this number already exists in the selected parking lot.");
        }

        SlotStatus status = parseAdminSlotStatus(safeRequest.getStatus());
        if (status == SlotStatus.BOOKED || status == SlotStatus.RESERVED || status == SlotStatus.OCCUPIED) {
            throw new IllegalArgumentException("New slots can only start as AVAILABLE or DISABLED.");
        }

        ParkingSlot slot = ParkingSlot.builder()
                .parkingLot(lot)
                .slotNumber(slotNumber)
                .floor(safeRequest.getFloor())
                .vehicleType(normalizeVehicleType(safeRequest.getVehicleType()))
                .status(status)
                .build();

        ParkingSlot savedSlot = parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null"));
        syncLotTotalSlots(lot);
        return toAdminSlotResponse(savedSlot);
    }

    @Transactional
    public AdminParkingSlotResponse updateSlot(Long slotId, AdminParkingSlotRequest request) {
        Long id = Objects.requireNonNull(slotId, "slotId must not be null");
        AdminParkingSlotRequest safeRequest = Objects.requireNonNull(request, "request must not be null");
        ParkingSlot slot = parkingSlotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Parking slot not found"));

        Long lotId = slot.getParkingLot().getId();
        if (!lotId.equals(safeRequest.getLotId())) {
            throw new IllegalArgumentException("Parking lot cannot be changed for an existing slot.");
        }

        String slotNumber = normalizeSlotNumber(safeRequest.getSlotNumber());
        if (parkingSlotRepository.existsByParkingLotIdAndSlotNumberIgnoreCaseAndIdNot(lotId, slotNumber, id)) {
            throw new IllegalStateException("A slot with this number already exists in the selected parking lot.");
        }

        SlotStatus targetStatus = parseAdminSlotStatus(safeRequest.getStatus());
        long activeBookings = bookingRepository.countBySlotIdAndStatusInAndIdNot(
                id,
                List.of(BookingStatus.PENDING, BookingStatus.ACTIVE),
                -1L
        );

        if (activeBookings > 0 && targetStatus != SlotStatus.BOOKED && targetStatus != SlotStatus.RESERVED && targetStatus != SlotStatus.OCCUPIED) {
            throw new IllegalStateException("This slot has active bookings, so it cannot be marked available or disabled.");
        }

        if (activeBookings == 0 && (targetStatus == SlotStatus.BOOKED || targetStatus == SlotStatus.RESERVED || targetStatus == SlotStatus.OCCUPIED)) {
            throw new IllegalStateException("Booked status is controlled by live bookings and cannot be set manually.");
        }

        slot.setSlotNumber(slotNumber);
        slot.setFloor(safeRequest.getFloor());
        slot.setVehicleType(normalizeVehicleType(safeRequest.getVehicleType()));
        slot.setStatus(targetStatus);
        return toAdminSlotResponse(parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null")));
    }

    @Transactional
    public void deleteSlot(Long slotId) {
        Long id = Objects.requireNonNull(slotId, "slotId must not be null");
        ParkingSlot slot = parkingSlotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Parking slot not found"));

        long activeBookings = bookingRepository.countBySlotIdAndStatusInAndIdNot(
                id,
                List.of(BookingStatus.PENDING, BookingStatus.ACTIVE),
                -1L
        );

        if (activeBookings > 0) {
            throw new IllegalStateException("This slot cannot be deleted because it has active bookings.");
        }

        ParkingLot lot = Objects.requireNonNull(slot.getParkingLot(), "parking lot must not be null");
        parkingSlotRepository.delete(Objects.requireNonNull(slot, "slot must not be null"));
        syncLotTotalSlots(lot);
    }

    private void syncLotTotalSlots(ParkingLot lot) {
        ParkingLot safeLot = Objects.requireNonNull(lot, "lot must not be null");
        safeLot.setTotalSlots((int) parkingSlotRepository.countByParkingLotId(safeLot.getId()));
        parkingLotRepository.save(safeLot);
    }

    private String normalizeLotName(String value) {
        String name = value == null ? "" : value.trim();
        if (name.isBlank()) {
            throw new IllegalArgumentException("Parking lot name is required.");
        }
        return name;
    }

    private String normalizeLotLocation(String value) {
        String location = value == null ? "" : value.trim();
        if (location.isBlank()) {
            throw new IllegalArgumentException("Parking lot location is required.");
        }
        return location;
    }

    private void reconcileLotSlots(ParkingLot lot, Integer requestedTotalSlots) {
        ParkingLot safeLot = Objects.requireNonNull(lot, "lot must not be null");
        int targetTotal = Objects.requireNonNull(requestedTotalSlots, "totalSlots must not be null");
        List<ParkingSlot> existingSlots = new ArrayList<>(parkingSlotRepository.findByParkingLotId(safeLot.getId()));

        if (targetTotal == existingSlots.size()) {
            return;
        }

        if (targetTotal > existingSlots.size()) {
            for (int i = existingSlots.size() + 1; i <= targetTotal; i++) {
                int floor = (i - 1) / 20 + 1;
                ParkingSlot slot = ParkingSlot.builder()
                        .parkingLot(safeLot)
                        .slotNumber("S" + i)
                        .floor(floor)
                        .vehicleType("Car")
                        .status(SlotStatus.AVAILABLE)
                        .build();
                parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null"));
            }
        } else {
            List<ParkingSlot> slotsToRemove = existingSlots.stream()
                    .sorted((left, right) -> right.getId().compareTo(left.getId()))
                    .limit(existingSlots.size() - targetTotal)
                    .toList();

            for (ParkingSlot slot : slotsToRemove) {
                long activeBookings = bookingRepository.countBySlotIdAndStatusInAndIdNot(
                        slot.getId(),
                        List.of(BookingStatus.PENDING, BookingStatus.ACTIVE),
                        -1L
                );
                if (activeBookings > 0) {
                    throw new IllegalStateException("Cannot reduce lot size while some slots still have active bookings.");
                }
                parkingSlotRepository.delete(slot);
            }
        }

        syncLotTotalSlots(safeLot);
    }

    private AdminParkingSlotResponse toAdminSlotResponse(ParkingSlot slot) {
        ParkingSlot safeSlot = Objects.requireNonNull(slot, "slot must not be null");
        return new AdminParkingSlotResponse(
                safeSlot.getId(),
                safeSlot.getParkingLot().getId(),
                safeSlot.getParkingLot().getName(),
                safeSlot.getSlotNumber(),
                safeSlot.getFloor(),
                safeSlot.getVehicleType(),
                safeSlot.getStatus().name(),
                safeSlot.getParkingLot().getPricePerHour()
        );
    }

    private UserFindParkingResponse toUserFindParkingResponse(ParkingSlot slot, LocalDateTime start, LocalDateTime end) {
        ParkingSlot safeSlot = Objects.requireNonNull(slot, "slot must not be null");
        long durationMinutes = Math.max(1, Duration.between(start, end).toMinutes());
        double estimatedPrice = Math.ceil((durationMinutes / 60.0) * safeSlot.getParkingLot().getPricePerHour());

        return new UserFindParkingResponse(
                safeSlot.getId(),
                safeSlot.getParkingLot().getId(),
                safeSlot.getParkingLot().getName(),
                safeSlot.getSlotNumber(),
                safeSlot.getFloor(),
                safeSlot.getVehicleType(),
                safeSlot.getStatus().name(),
                safeSlot.getParkingLot().getPricePerHour(),
                durationMinutes,
                estimatedPrice
        );
    }

    private SlotStatus parseAdminSlotStatus(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Slot status is required.");
        }

        String normalized = value.trim().toUpperCase();
        if ("MAINTENANCE".equals(normalized)) {
            return SlotStatus.MAINTENANCE;
        }

        try {
            return SlotStatus.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid slot status: " + value);
        }
    }

    private String normalizeSlotNumber(String value) {
        String slotNumber = value == null ? "" : value.trim().toUpperCase();
        if (slotNumber.isBlank()) {
            throw new IllegalArgumentException("Slot number is required.");
        }
        return slotNumber;
    }

    private String normalizeVehicleType(String value) {
        String vehicleType = value == null ? "" : value.trim();
        if (vehicleType.isBlank()) {
            throw new IllegalArgumentException("Vehicle type is required.");
        }
        return vehicleType;
    }

    private Integer parseFloorFilter(String value) {
        String floor = value == null ? "" : value.trim();
        if (floor.isBlank() || "ALL".equalsIgnoreCase(floor) || "ALL FLOORS".equalsIgnoreCase(floor)) {
            return null;
        }
        if (floor.toLowerCase().startsWith("floor")) {
            floor = floor.substring(5).trim();
        }
        try {
            return Integer.valueOf(floor);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid floor selection.");
        }
    }

    private String normalizeFilter(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private boolean matchesVehicleType(String slotType, String requestedVehicleType) {
        if (requestedVehicleType == null || requestedVehicleType.isBlank() || "all".equalsIgnoreCase(requestedVehicleType)) {
            return true;
        }
        String slot = slotType == null ? "" : slotType.trim().toLowerCase();
        String requested = requestedVehicleType.toLowerCase();
        if (requested.contains("two")) {
            return slot.contains("two") || slot.contains("bike") || slot.contains("motor") || slot.contains("wheeler");
        }
        if (requested.contains("four")) {
            return slot.contains("four") || slot.contains("car") || slot.contains("auto") || slot.contains("wheeler");
        }
        return slot.contains(requested) || requested.contains(slot);
    }
}
