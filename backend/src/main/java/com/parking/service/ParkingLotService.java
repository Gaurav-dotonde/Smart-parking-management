package com.parking.service;

import com.parking.dto.AdminParkingSlotRequest;
import com.parking.dto.AdminParkingSlotResponse;
import com.parking.dto.BulkParkingSlotRequest;
import com.parking.dto.BulkParkingSlotResponse;
import com.parking.dto.FloorSummaryResponse;
import com.parking.dto.ParkingLotRequest;
import com.parking.dto.ParkingSlotPageResponse;
import com.parking.dto.ParkingSlotResponse;
import com.parking.dto.ParkingSlotSummaryResponse;
import com.parking.dto.UserFindParkingQuery;
import com.parking.dto.UserFindParkingResponse;
import com.parking.model.Booking;
import com.parking.model.BookingStatus;
import com.parking.model.ParkingLot;
import com.parking.model.ParkingSlot;
import com.parking.model.ParkingFloor;
import com.parking.model.SlotStatus;
import com.parking.repository.BookingRepository;
import com.parking.repository.ParkingLotRepository;
import com.parking.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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
        String location = normalizeLotLocation(firstPresent(safeRequest.getAddress(), safeRequest.getLocation()));
        validateLotRequest(safeRequest);
        if (parkingLotRepository.existsByNameIgnoreCaseAndArchivedFalse(name)) {
            throw new IllegalStateException("An active or inactive parking location with this name already exists.");
        }

        ParkingLot lot = ParkingLot.builder()
                .name(name)
                .location(location)
                .address(location)
                .area(trimToNull(safeRequest.getArea()))
                .city(trimToNull(safeRequest.getCity()))
                .state(trimToNull(safeRequest.getState()))
                .pinCode(trimToNull(safeRequest.getPinCode()))
                .totalSlots(safeRequest.getTotalSlots())
                .pricePerDay(safeRequest.getPricePerDay())
                .active(safeRequest.getActive() == null || safeRequest.getActive())
                .archived(false)
                .openingTime(safeRequest.getOpeningTime())
                .closingTime(safeRequest.getClosingTime())
                .build();

        lot = parkingLotRepository.save(Objects.requireNonNull(lot, "lot must not be null"));
        reconcileCapacity(lot, safeRequest.getTotalSlots());
        return synchronizeLotStatistics(lot);
    }

    @Transactional
    public List<ParkingLot> getAllLots() {
        return parkingLotRepository.findAll().stream().map(this::synchronizeLotStatistics).toList();
    }

    @Transactional
    public List<ParkingLot> getActiveLots() {
        return parkingLotRepository.findByActiveTrueAndArchivedFalseOrderByCreatedAtDesc().stream()
                .map(this::synchronizeLotStatistics).toList();
    }

    public ParkingLot getLotById(Long id) {
        return parkingLotRepository.findById(Objects.requireNonNull(id, "id must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Parking lot not found"));
    }

    @Transactional
    public ParkingLot updateLot(Long id, ParkingLotRequest request) {
        ParkingLot lot = getLotById(Objects.requireNonNull(id, "id must not be null"));
        ParkingLotRequest safeRequest = mergeUpdateRequest(lot, Objects.requireNonNull(request, "request must not be null"));
        String name = normalizeLotName(safeRequest.getName());
        String location = normalizeLotLocation(firstPresent(safeRequest.getAddress(), safeRequest.getLocation()));
        validateLotRequest(safeRequest);
        if (parkingLotRepository.existsByNameIgnoreCaseAndArchivedFalseAndIdNot(name, lot.getId())) {
            throw new IllegalStateException("An active or inactive parking location with this name already exists.");
        }

        lot.setName(name);
        lot.setLocation(location);
        lot.setAddress(location);
        lot.setArea(trimToNull(safeRequest.getArea()));
        lot.setCity(trimToNull(safeRequest.getCity()));
        lot.setState(trimToNull(safeRequest.getState()));
        lot.setPinCode(trimToNull(safeRequest.getPinCode()));
        lot.setPricePerDay(safeRequest.getPricePerDay());
        lot.setActive(safeRequest.getActive() == null || safeRequest.getActive());
        lot.setOpeningTime(safeRequest.getOpeningTime());
        lot.setClosingTime(safeRequest.getClosingTime());
        reconcileCapacity(lot, safeRequest.getTotalSlots());
        return synchronizeLotStatistics(parkingLotRepository.save(lot));
    }

    @Transactional
    public ParkingLot archiveLot(Long id) {
        ParkingLot lot = getLotById(id);
        List<ParkingSlot> slots = parkingSlotRepository.findByParkingLotIdAndArchivedFalse(id);
        boolean hasProtectedSlots = slots.stream().anyMatch(slot -> slot.getStatus() != SlotStatus.AVAILABLE);
        if (hasProtectedSlots) {
            throw new IllegalStateException("This parking location cannot be deleted while it contains booked, occupied, reserved, maintenance or disabled slots.");
        }
        slots.forEach(slot -> { slot.setArchived(true); slot.setArchivedAt(LocalDateTime.now()); slot.setStatus(SlotStatus.INACTIVE); });
        parkingSlotRepository.saveAll(slots);
        lot.setActive(false);
        lot.setArchived(true);
        lot.setArchivedAt(LocalDateTime.now());
        return synchronizeLotStatistics(parkingLotRepository.save(lot));
    }

    @Transactional
    public ParkingLot setLotActive(Long id, boolean active) {
        ParkingLot lot = getLotById(id);
        if (Boolean.TRUE.equals(lot.getArchived()) && active) {
            throw new IllegalStateException("Archived parking locations cannot be activated. Edit the location to restore it first.");
        }
        lot.setActive(active);
        return parkingLotRepository.save(lot);
    }

    @Transactional(readOnly = true)
    public List<ParkingSlotResponse> getSlotsByLot(Long lotId, LocalDateTime startTime, LocalDateTime endTime) {
        Long id = Objects.requireNonNull(lotId, "lotId must not be null");
        getLotById(id);
        java.util.Set<Long> reservedSlotIds = startTime != null && endTime != null && endTime.isAfter(startTime)
                ? new java.util.HashSet<>(bookingRepository.findReservedSlotIds(id, startTime, endTime,
                    List.of(BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.EXPIRED)))
                : java.util.Set.of();
        return parkingSlotRepository.findByParkingLotIdAndArchivedFalse(id).stream()
                .map(slot -> new ParkingSlotResponse(
                        slot.getId(), slot.getParkingLot().getId(), slot.getParkingLot().getName(),
                        slot.getSlotNumber(), slot.getFloor(), slot.getVehicleType(),
                        reservedSlotIds.contains(slot.getId()) && slot.getStatus() == SlotStatus.AVAILABLE
                                ? SlotStatus.RESERVED.name() : slot.getStatus().name(),
                        slot.getVersion()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ParkingSlotResponse> getSlotsByLot(Long lotId) {
        return getSlotsByLot(lotId, null, null);
    }

    public List<AdminParkingSlotResponse> getAdminSlotsByLot(Long lotId) {
        Long id = Objects.requireNonNull(lotId, "lotId must not be null");
        getLotById(id);
        return parkingSlotRepository.findByParkingLotIdAndArchivedFalse(id)
                .stream()
                .map(this::toAdminSlotResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ParkingSlotSummaryResponse getSlotSummary(Long lotId) {
        Long id = Objects.requireNonNull(lotId, "lotId must not be null");
        ParkingLot lot = getLotById(id);

        List<Object[]> rows = parkingSlotRepository.countByFloorAndStatus(id);
        Map<Integer, Map<SlotStatus, Long>> matrix = new HashMap<>();
        long total = 0;

        for (Object[] row : rows) {
            Integer floor = (Integer) row[0];
            SlotStatus status = (SlotStatus) row[1];
            Long count = (Long) row[2];
            matrix.computeIfAbsent(floor, k -> new HashMap<>()).put(status, count);
            total += count;
        }

        List<FloorSummaryResponse> floorSummaries = java.util.stream.IntStream.range(0, lot.getTotalFloors())
                .boxed()
                .map(floor -> {
                    Map<SlotStatus, Long> counts = matrix.getOrDefault(floor, Map.of());
                    long available = counts.getOrDefault(SlotStatus.AVAILABLE, 0L);
                    long reserved = counts.getOrDefault(SlotStatus.RESERVED, 0L);
                    long booked = counts.getOrDefault(SlotStatus.BOOKED, 0L);
                    long occupied = counts.getOrDefault(SlotStatus.OCCUPIED, 0L);
                    long maintenance = counts.getOrDefault(SlotStatus.MAINTENANCE, 0L);
                    long disabled = counts.getOrDefault(SlotStatus.DISABLED, 0L);
                    return new FloorSummaryResponse(floor, toFloorName(floor), available + reserved + booked + occupied + maintenance + disabled,
                            available, reserved, booked, maintenance, disabled);
                })
                .toList();

        long available = totalByStatus(matrix, SlotStatus.AVAILABLE);
        long reserved = totalByStatus(matrix, SlotStatus.RESERVED);
        long booked = totalByStatus(matrix, SlotStatus.BOOKED);
        long maintenance = totalByStatus(matrix, SlotStatus.MAINTENANCE);
        long disabled = totalByStatus(matrix, SlotStatus.DISABLED);

        return new ParkingSlotSummaryResponse(id, lot.getName(), total, available, reserved, booked, maintenance, disabled, floorSummaries);
    }

    @Transactional(readOnly = true)
    public ParkingSlotSummaryResponse getAllSlotSummary() {
        List<Object[]> rows = parkingSlotRepository.countAllByFloorAndStatus();
        Map<Integer, Map<SlotStatus, Long>> matrix = new HashMap<>();
        long total = 0;
        for (Object[] row : rows) {
            Integer floor = (Integer) row[0];
            SlotStatus status = (SlotStatus) row[1];
            Long count = (Long) row[2];
            matrix.computeIfAbsent(floor, k -> new HashMap<>()).put(status, count);
            total += count;
        }
        int floorCount = matrix.keySet().stream()
                .mapToInt(floor -> Objects.requireNonNull(floor, "floor must not be null"))
                .max()
                .orElse(-1) + 1;
        List<FloorSummaryResponse> floors = java.util.stream.IntStream.range(0, floorCount).boxed().map(floor -> {
            Map<SlotStatus, Long> counts = matrix.getOrDefault(floor, Map.of());
            long available = counts.getOrDefault(SlotStatus.AVAILABLE, 0L);
            long reserved = counts.getOrDefault(SlotStatus.RESERVED, 0L);
            long booked = counts.getOrDefault(SlotStatus.BOOKED, 0L);
            long occupied = counts.getOrDefault(SlotStatus.OCCUPIED, 0L);
            long maintenance = counts.getOrDefault(SlotStatus.MAINTENANCE, 0L);
            long disabled = counts.getOrDefault(SlotStatus.DISABLED, 0L);
            return new FloorSummaryResponse(floor, toFloorName(floor), available + reserved + booked + occupied + maintenance + disabled,
                    available, reserved, booked, maintenance, disabled);
        }).toList();
        return new ParkingSlotSummaryResponse(null, "All Locations", total,
                totalByStatus(matrix, SlotStatus.AVAILABLE), totalByStatus(matrix, SlotStatus.RESERVED),
                totalByStatus(matrix, SlotStatus.BOOKED), totalByStatus(matrix, SlotStatus.MAINTENANCE),
                totalByStatus(matrix, SlotStatus.DISABLED), floors);
    }

    @Transactional(readOnly = true)
    public ParkingSlotPageResponse getAdminSlotsByLotPaged(Long lotId, Pageable pageable, Specification<ParkingSlot> spec) {
        Long id = Objects.requireNonNull(lotId, "lotId must not be null");
        getLotById(id);
        Specification<ParkingSlot> base = (root, query, cb) -> cb.equal(root.join("parkingLot").get("id"), id);
        base = base.and((root, query, cb) -> cb.equal(root.get("archived"), false));
        if (spec != null) base = base.and(spec);

        Page<ParkingSlot> page = parkingSlotRepository.findAll(base, pageable);
        List<AdminParkingSlotResponse> content = page.getContent().stream()
                .map(this::toAdminSlotResponse)
                .toList();
        return new ParkingSlotPageResponse(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isFirst(), page.isLast());
    }

    @Transactional(readOnly = true)
    public ParkingSlotPageResponse getAllAdminSlotsPaged(Pageable pageable, Specification<ParkingSlot> spec) {
        Specification<ParkingSlot> base = (root, query, cb) -> cb.equal(root.get("archived"), false);
        if (spec != null) base = base.and(spec);
        Page<ParkingSlot> page = parkingSlotRepository.findAll(base, pageable);
        List<AdminParkingSlotResponse> content = page.getContent().stream().map(this::toAdminSlotResponse).toList();
        return new ParkingSlotPageResponse(content, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isFirst(), page.isLast());
    }

    @Transactional(readOnly = true)
    public List<AdminParkingSlotResponse> getAllAdminSlots() {
        return parkingSlotRepository.findByArchivedFalseOrderByUpdatedAtDesc().stream().map(this::toAdminSlotResponse).toList();
    }

    @Transactional(readOnly = true)
    public AdminParkingSlotResponse getAdminSlot(Long id) {
        return toAdminSlotResponse(parkingSlotRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Parking slot not found")));
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
        Long requestedLotId = safeQuery.getLotId();

        List<BookingStatus> activeStatuses = List.of(BookingStatus.PENDING, BookingStatus.ACTIVE);

        return parkingSlotRepository.findAll()
                .stream()
                .filter(slot -> slot.getParkingLot() != null && Boolean.TRUE.equals(slot.getParkingLot().getActive()))
                .filter(slot -> requestedLotId == null || requestedLotId.equals(slot.getParkingLot().getId()))
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
        SlotLayout layout = nextManualLayout(lot.getId());

        SlotStatus status = parseAdminSlotStatus(safeRequest.getStatus());
        if (status == SlotStatus.BOOKED || status == SlotStatus.RESERVED || status == SlotStatus.OCCUPIED) {
            throw new IllegalArgumentException("New slots cannot start as BOOKED, RESERVED or OCCUPIED without an active booking.");
        }

        ParkingSlot slot = ParkingSlot.builder()
                .parkingLot(lot)
                .slotNumber(ParkingFloor.generatedSlotNumber(layout.sequence()))
                .floor(layout.floor())
                .vehicleType(normalizeVehicleType(safeRequest.getVehicleType()))
                .zone(ParkingFloor.zoneOf(layout.floor()))
                .slotType(normalizeSlotType(safeRequest.getSlotType()))
                .priceOverride(safeRequest.getPriceOverride())
                .evChargingAvailable(Boolean.TRUE.equals(safeRequest.getEvChargingAvailable()))
                .accessibleSlot(Boolean.TRUE.equals(safeRequest.getAccessibleSlot()))
                .notes(trimToNull(safeRequest.getNotes()))
                .status(status)
                .build();

        ParkingSlot savedSlot = parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null"));
        lot.setTotalSlots((int) parkingSlotRepository.countByParkingLotIdAndArchivedFalse(lot.getId()));
        synchronizeLotStatistics(lot);
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
        validateFloorAndSlotNumber(safeRequest.getFloor(), slotNumber);
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
        slot.setZone(trimToNull(safeRequest.getZone()));
        slot.setSlotType(normalizeSlotType(safeRequest.getSlotType()));
        slot.setPriceOverride(safeRequest.getPriceOverride());
        slot.setEvChargingAvailable(Boolean.TRUE.equals(safeRequest.getEvChargingAvailable()));
        slot.setAccessibleSlot(Boolean.TRUE.equals(safeRequest.getAccessibleSlot()));
        slot.setNotes(trimToNull(safeRequest.getNotes()));
        slot.setStatus(targetStatus);
        AdminParkingSlotResponse response = toAdminSlotResponse(parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null")));
        synchronizeLotStatistics(slot.getParkingLot());
        return response;
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

        if (activeBookings > 0 || slot.getStatus() == SlotStatus.OCCUPIED) {
            throw new IllegalStateException("This slot cannot be archived because it has an active booking.");
        }

        slot.setArchived(true);
        slot.setArchivedAt(LocalDateTime.now());
        slot.setStatus(SlotStatus.INACTIVE);
        parkingSlotRepository.save(slot);
        synchronizeLotStatistics(slot.getParkingLot());
    }

    @Transactional
    public AdminParkingSlotResponse setSlotStatus(Long slotId, String requestedStatus) {
        ParkingSlot slot = parkingSlotRepository.findById(slotId)
                .orElseThrow(() -> new IllegalArgumentException("Parking slot not found"));
        SlotStatus target = parseAdminSlotStatus(requestedStatus);
        long active = bookingRepository.countBySlotIdAndStatusInAndIdNot(slotId, List.of(BookingStatus.PENDING, BookingStatus.ACTIVE), -1L);
        if (slot.getStatus() == SlotStatus.OCCUPIED && target == SlotStatus.DISABLED) {
            throw new IllegalStateException("An occupied slot cannot be disabled.");
        }
        if (active == 0 && List.of(SlotStatus.BOOKED, SlotStatus.RESERVED, SlotStatus.OCCUPIED).contains(target)) {
            throw new IllegalStateException("BOOKED, RESERVED and OCCUPIED require a related active booking.");
        }
        if (active > 0 && List.of(SlotStatus.AVAILABLE, SlotStatus.MAINTENANCE, SlotStatus.DISABLED).contains(target)) {
            throw new IllegalStateException("The slot has an active booking and cannot be made unavailable manually.");
        }
        slot.setStatus(target);
        AdminParkingSlotResponse response = toAdminSlotResponse(parkingSlotRepository.save(slot));
        synchronizeLotStatistics(slot.getParkingLot());
        return response;
    }

    @Transactional
    public BulkParkingSlotResponse bulkCreateSlots(Long lotId, BulkParkingSlotRequest request) {
        ParkingLot lot = getLotById(lotId);
        SlotStatus status = parseAdminSlotStatus(request.getDefaultStatus());
        if (List.of(SlotStatus.BOOKED, SlotStatus.RESERVED, SlotStatus.OCCUPIED).contains(status)) {
            throw new IllegalArgumentException("Bulk-created slots cannot start as BOOKED, RESERVED or OCCUPIED.");
        }
        List<String> skipped = new ArrayList<>();
        List<ParkingSlot> created = new ArrayList<>();
        for (int index = 0; index < request.getCount(); index++) {
            SlotLayout layout;
            try { layout = nextManualLayout(lotId, created.size()); }
            catch (IllegalStateException ex) { skipped.add(ex.getMessage()); break; }
            created.add(ParkingSlot.builder().parkingLot(lot).slotNumber(ParkingFloor.generatedSlotNumber(layout.sequence())).floor(layout.floor())
                    .zone(ParkingFloor.zoneOf(layout.floor())).vehicleType(normalizeVehicleType(request.getVehicleType()))
                    .slotType(normalizeSlotType(request.getSlotType())).priceOverride(request.getPriceOverride())
                    .evChargingAvailable("EV CHARGING".equalsIgnoreCase(request.getSlotType()))
                    .accessibleSlot("ACCESSIBLE".equalsIgnoreCase(request.getSlotType())).status(status).build());
        }
        parkingSlotRepository.saveAll(created);
        lot.setTotalSlots((int) parkingSlotRepository.countByParkingLotIdAndArchivedFalse(lotId));
        synchronizeLotStatistics(lot);
        return new BulkParkingSlotResponse(created.size(), skipped.size(), 0, skipped);
    }

    @Transactional(readOnly = true)
    public Specification<ParkingSlot> buildSlotSpecification(String search, Integer floor, String zone, String vehicleType, String slotType, String status) {
        Specification<ParkingSlot> spec = Specification.unrestricted();
        if (search != null && !search.isBlank()) {
            spec = spec.and(parkingSlotRepository.slotNumberContainsIgnoreCase(search));
        }
        if (floor != null) {
            spec = spec.and(parkingSlotRepository.hasFloor(floor));
        }
        if (zone != null && !zone.isBlank()) {
            spec = spec.and(parkingSlotRepository.zoneContainsIgnoreCase(zone));
        }
        if (vehicleType != null && !vehicleType.isBlank()) {
            spec = spec.and(parkingSlotRepository.hasVehicleType(vehicleType));
        }
        if (slotType != null && !slotType.isBlank()) {
            spec = spec.and(parkingSlotRepository.hasSlotType(slotType));
        }
        if (status != null && !status.isBlank()) {
            SlotStatus parsed = SlotStatus.valueOf(status.toUpperCase());
            spec = spec.and(parkingSlotRepository.hasStatus(parsed));
        }
        return spec;
    }

    private void reconcileCapacity(ParkingLot lot, int targetCapacity) {
        List<ParkingSlot> current = new ArrayList<>(parkingSlotRepository
                .findByParkingLotIdAndArchivedFalseOrderByFloorDescSlotNumberDesc(lot.getId()));
        int currentCapacity = current.size();

        if (targetCapacity < currentCapacity) {
            int removeCount = currentCapacity - targetCapacity;
            List<ParkingSlot> surplus = current.subList(0, removeCount);
            List<ParkingSlot> protectedSlots = surplus.stream()
                    .filter(slot -> slot.getStatus() != SlotStatus.AVAILABLE).toList();
            if (!protectedSlots.isEmpty()) {
                String numbers = protectedSlots.stream()
                        .map(slot -> Objects.requireNonNull(slot, "parking slot must not be null").getSlotNumber())
                        .limit(8)
                        .collect(Collectors.joining(", "));
                throw new IllegalStateException("Capacity cannot be reduced because these surplus slots are not AVAILABLE: " + numbers);
            }
            List<ParkingSlot> withHistory = surplus.stream()
                    .filter(slot -> bookingRepository.countBySlotId(slot.getId()) > 0).toList();
            withHistory.forEach(slot -> {
                slot.setArchived(true);
                slot.setArchivedAt(LocalDateTime.now());
            slot.setStatus(SlotStatus.INACTIVE);
            });
            parkingSlotRepository.saveAll(withHistory);
            parkingSlotRepository.deleteAll(surplus.stream().filter(slot -> !withHistory.contains(slot)).toList());
            parkingSlotRepository.flush();
        } else if (targetCapacity > currentCapacity) {
            List<ParkingSlot> additions = new ArrayList<>();
            Set<String> usedNumbers = parkingSlotRepository.findByParkingLotId(lot.getId()).stream()
                    .map(slot -> Objects.requireNonNull(slot, "parking slot must not be null").getSlotNumber())
                    .collect(Collectors.toSet());
            int sequence = 1;
            while (additions.size() < targetCapacity - currentCapacity) {
                String number = ParkingFloor.generatedSlotNumber(sequence);
                if (!usedNumbers.contains(number)) {
                    int layoutIndex = currentCapacity + additions.size();
                    additions.add(ParkingSlot.builder()
                            .parkingLot(lot)
                            .slotNumber(number)
                            .floor(layoutIndex / ParkingFloor.DEFAULT_SLOTS_PER_FLOOR)
                            .zone(ParkingFloor.zoneOf(layoutIndex / ParkingFloor.DEFAULT_SLOTS_PER_FLOOR))
                            .vehicleType("Car")
                            .slotType("STANDARD")
                            .status(SlotStatus.AVAILABLE)
                            .archived(false)
                            .build());
                    usedNumbers.add(number);
                }
                sequence++;
            }
            parkingSlotRepository.saveAll(additions);
            parkingSlotRepository.flush();
        }
        lot.setTotalSlots(targetCapacity);
        lot.setTotalFloors(ParkingFloor.floorCount(targetCapacity));
    }

    private ParkingLot synchronizeLotStatistics(ParkingLot lot) {
        long total = parkingSlotRepository.countByParkingLotIdAndArchivedFalse(lot.getId());
        lot.setTotalSlots((int) total);
        lot.setTotalFloors(ParkingFloor.floorCount((int) total));
        lot.setAvailableSlots(statusCount(lot, SlotStatus.AVAILABLE));
        lot.setBookedSlots(statusCount(lot, SlotStatus.BOOKED));
        lot.setReservedSlots(statusCount(lot, SlotStatus.RESERVED));
        lot.setMaintenanceSlots(statusCount(lot, SlotStatus.MAINTENANCE));
        lot.setDisabledSlots(statusCount(lot, SlotStatus.DISABLED));
        return parkingLotRepository.save(lot);
    }

    private int statusCount(ParkingLot lot, SlotStatus status) {
        return (int) parkingSlotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lot.getId(), status);
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

    private void validateLotRequest(ParkingLotRequest request) {
        if (request.getTotalSlots() == null || request.getTotalSlots() < 1 || request.getTotalSlots() > 10000) {
            throw new IllegalArgumentException("Total capacity must be a whole number between 1 and 10000.");
        }
        if (request.getPricePerDay() == null || request.getPricePerDay() <= 0) {
            throw new IllegalArgumentException("Price per day is required and must be greater than zero.");
        }
        if (request.getCity() == null || request.getCity().isBlank()) {
            throw new IllegalArgumentException("City is required.");
        }
        if (request.getOpeningTime() == null) {
            throw new IllegalArgumentException("Opening time is required.");
        }
        if (request.getClosingTime() == null) {
            throw new IllegalArgumentException("Closing time is required.");
        }
        if (!request.getClosingTime().isAfter(request.getOpeningTime())) {
            throw new IllegalArgumentException("Closing time must be after opening time.");
        }
    }

    /**
     * PUT supports a capacity-only edit while preserving the existing location
     * details. Capacity is intentionally not inferred: it must always be sent
     * and is validated by {@link #validateLotRequest(ParkingLotRequest)}.
     */
    private ParkingLotRequest mergeUpdateRequest(ParkingLot lot, ParkingLotRequest request) {
        if (request.getName() == null) request.setName(lot.getName());
        if (request.getAddress() == null && request.getLocation() == null) {
            request.setAddress(firstPresent(lot.getAddress(), lot.getLocation()));
        }
        if (request.getArea() == null) request.setArea(lot.getArea());
        if (request.getCity() == null) request.setCity(lot.getCity());
        if (request.getState() == null) request.setState(lot.getState());
        if (request.getPinCode() == null) request.setPinCode(lot.getPinCode());
        if (request.getPricePerDay() == null) request.setPricePerDay(lot.getPricePerDay());
        if (request.getActive() == null) request.setActive(lot.getActive());
        if (request.getOpeningTime() == null) request.setOpeningTime(lot.getOpeningTime());
        if (request.getClosingTime() == null) request.setClosingTime(lot.getClosingTime());
        return request;
    }

    private String firstPresent(String preferred, String fallback) {
        return preferred != null && !preferred.isBlank() ? preferred : fallback;
    }

    private String trimToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private AdminParkingSlotResponse toAdminSlotResponse(ParkingSlot slot) {
        ParkingSlot safeSlot = Objects.requireNonNull(slot, "slot must not be null");
        Booking current = bookingRepository.findFirstBySlotIdAndStatusInOrderByStartTimeAsc(
                safeSlot.getId(), List.of(BookingStatus.PENDING, BookingStatus.ACTIVE)).orElse(null);
        return new AdminParkingSlotResponse(safeSlot.getId(), safeSlot.getParkingLot().getId(),
                safeSlot.getParkingLot().getName(), safeSlot.getParkingLot().getId(), safeSlot.getParkingLot().getName(),
                safeSlot.getParkingLot().getLocation(), safeSlot.getSlotNumber(),
                safeSlot.getFloor(), safeSlot.getZone(), safeSlot.getVehicleType(), safeSlot.getSlotType(),
                safeSlot.getPriceOverride() == null ? safeSlot.getParkingLot().getPricePerDay() : safeSlot.getPriceOverride(),
                safeSlot.getPriceOverride(), safeSlot.getStatus().name(), safeSlot.getEvChargingAvailable(),
                safeSlot.getAccessibleSlot(), safeSlot.getNotes(), safeSlot.getArchived(), safeSlot.getCreatedAt(), safeSlot.getUpdatedAt(), safeSlot.getVersion(),
                current == null ? null : current.getId(), current == null ? null : current.getUser().getName(),
                current == null ? null : current.getUser().getEmail(), current == null ? null : current.getVehicleNumber(),
                current == null ? null : current.getStartTime(), current == null ? null : current.getEndTime());
    }

    private UserFindParkingResponse toUserFindParkingResponse(ParkingSlot slot, LocalDateTime start, LocalDateTime end) {
        ParkingSlot safeSlot = Objects.requireNonNull(slot, "slot must not be null");
        long durationMinutes = Math.max(1, Duration.between(start, end).toMinutes());
        long days = Math.max(1, (long) Math.ceil(durationMinutes / 1440.0));
        double estimatedPrice = days * safeSlot.getParkingLot().getPricePerDay();

        return new UserFindParkingResponse(
                safeSlot.getId(),
                safeSlot.getParkingLot().getId(),
                safeSlot.getParkingLot().getName(),
                safeSlot.getParkingLot().getLocation(),
                safeSlot.getSlotNumber(),
                safeSlot.getFloor(),
                safeSlot.getVehicleType(),
                safeSlot.getStatus().name(),
                safeSlot.getParkingLot().getPricePerDay(),
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

    private void validateFloorAndSlotNumber(Integer floorValue, String slotNumber) {
        int floor = Objects.requireNonNull(floorValue, "floor is required");
        if (floor < 0) throw new IllegalArgumentException("Floor cannot be negative.");
        if (!slotNumber.matches("[A-Z0-9-]+")) throw new IllegalArgumentException("Invalid slot number.");
    }

    private record SlotLayout(int floor, int sequence) { }

    private SlotLayout nextManualLayout(Long lotId) {
        return nextManualLayout(lotId, 0);
    }

    private SlotLayout nextManualLayout(Long lotId, int pendingCreates) {
        long existing = parkingSlotRepository.countByParkingLotId(lotId) + pendingCreates;
        int index = (int) existing;
        return new SlotLayout(index / ParkingFloor.DEFAULT_SLOTS_PER_FLOOR, index + 1);
    }

    private String normalizeVehicleType(String value) {
        String vehicleType = value == null ? "" : value.trim();
        if (vehicleType.isBlank()) {
            throw new IllegalArgumentException("Vehicle type is required.");
        }
        Set<String> supported = Set.of("TWO WHEELER", "CAR", "SUV", "COMMERCIAL VEHICLE");
        String normalized = vehicleType.toUpperCase();
        if (!supported.contains(normalized)) throw new IllegalArgumentException("Unsupported vehicle type: " + value);
        return switch (normalized) { case "TWO WHEELER" -> "Two Wheeler"; case "COMMERCIAL VEHICLE" -> "Commercial Vehicle"; default -> normalized.charAt(0) + normalized.substring(1).toLowerCase(); };
    }

    private String normalizeSlotType(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        if (!Set.of("STANDARD", "COMPACT", "LARGE", "ACCESSIBLE", "EV CHARGING", "VIP").contains(normalized)) {
            throw new IllegalArgumentException("Unsupported slot type: " + value);
        }
        return normalized;
    }

    private Integer parseFloorFilter(String value) {
        String floor = value == null ? "" : value.trim();
        if (floor.isBlank() || "ALL".equalsIgnoreCase(floor) || "ALL FLOORS".equalsIgnoreCase(floor)) {
            return null;
        }
        if ("GROUND FLOOR".equalsIgnoreCase(floor) || "GROUND".equalsIgnoreCase(floor)) {
            return 0;
        }
        String normalizedName = floor.replaceFirst("(?i)\\s+floor$", "").trim();
        List<String> ordinalNames = List.of(
                "Ground", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth",
                "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth",
                "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth"
        );
        for (int index = 0; index < ordinalNames.size(); index++) {
            if (ordinalNames.get(index).equalsIgnoreCase(normalizedName)) {
                return index;
            }
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
        String requested = requestedVehicleType.toLowerCase();
        if (requested.contains("two") || requested.contains("bike") || requested.contains("motor")
                || requested.contains("car") || requested.contains("four")) {
            return true;
        }
        String slot = slotType == null ? "" : slotType.trim().toLowerCase();
        return slot.contains(requested) || requested.contains(slot);
    }

    private long totalByStatus(Map<Integer, Map<SlotStatus, Long>> matrix, SlotStatus status) {
        long total = 0;
        for (Map<SlotStatus, Long> floorCounts : matrix.values()) {
            total += floorCounts.getOrDefault(status, 0L);
        }
        return total;
    }

    private String toFloorName(int floor) {
        return ParkingFloor.nameOf(floor);
    }
}
