package com.parking.service;

import com.parking.dto.FloorSlotMigrationResponse;
import com.parking.model.ParkingFloor;
import com.parking.model.ParkingLot;
import com.parking.model.ParkingSlot;
import com.parking.model.SlotStatus;
import com.parking.repository.ParkingLotRepository;
import com.parking.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Normalizes legacy slot identifiers without changing a location's configured capacity. */
@Service
@RequiredArgsConstructor
public class ParkingSlotLayoutMigrationService {
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSlotRepository parkingSlotRepository;

    @Transactional
    public FloorSlotMigrationResponse migrate(Long lotId) {
        ParkingLot lot = parkingLotRepository.findById(lotId)
                .orElseThrow(() -> new IllegalArgumentException("Parking location not found."));
        List<ParkingSlot> allSlots = new ArrayList<>(parkingSlotRepository.findByParkingLotId(lotId));
        int before = (int) allSlots.stream().filter(slot -> !Boolean.TRUE.equals(slot.getArchived())).count();
        int targetCapacity = lot.getTotalSlots() == null || lot.getTotalSlots() < 1 ? before : lot.getTotalSlots();

        List<ParkingSlot> active = allSlots.stream()
                .filter(slot -> !Boolean.TRUE.equals(slot.getArchived()))
                .sorted(Comparator.comparing(slot -> slot.getId()))
                .limit(targetCapacity)
                .toList();

        // Preserve records with booking history while taking surplus legacy slots out of the active layout.
        for (ParkingSlot slot : allSlots) {
            if (!active.contains(slot) && !Boolean.TRUE.equals(slot.getArchived())) {
                slot.setArchived(true);
                slot.setArchivedAt(LocalDateTime.now());
                slot.setStatus(SlotStatus.INACTIVE);
            }
        }

        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        for (ParkingSlot slot : allSlots) {
            slot.setSlotNumber("MIG" + token + slot.getId());
            slot.setFloor(0);
            slot.setZone(ParkingFloor.zoneOf(0));
        }
        parkingSlotRepository.saveAll(allSlots);
        parkingSlotRepository.flush();

        List<ParkingSlot> normalized = new ArrayList<>(active);
        for (int index = normalized.size(); index < targetCapacity; index++) {
            normalized.add(ParkingSlot.builder()
                    .parkingLot(lot)
                    .vehicleType("Car")
                    .slotType("STANDARD")
                    .status(SlotStatus.AVAILABLE)
                    .archived(false)
                    .build());
        }
        for (int index = 0; index < normalized.size(); index++) {
            int floor = index / ParkingFloor.DEFAULT_SLOTS_PER_FLOOR;
            ParkingSlot slot = normalized.get(index);
            slot.setSlotNumber(ParkingFloor.generatedSlotNumber(index + 1));
            slot.setFloor(floor);
            slot.setZone(ParkingFloor.zoneOf(floor));
            slot.setArchived(false);
            slot.setArchivedAt(null);
        }
        parkingSlotRepository.saveAll(normalized);
        lot.setTotalSlots(targetCapacity);
        lot.setTotalFloors(ParkingFloor.floorCount(targetCapacity));
        lot.setAvailableSlots(statusCount(lotId, SlotStatus.AVAILABLE));
        lot.setBookedSlots(statusCount(lotId, SlotStatus.BOOKED));
        lot.setReservedSlots(statusCount(lotId, SlotStatus.RESERVED));
        lot.setMaintenanceSlots(statusCount(lotId, SlotStatus.MAINTENANCE));
        lot.setDisabledSlots(statusCount(lotId, SlotStatus.INACTIVE));
        parkingLotRepository.save(lot);

        return response(lot, before, normalized.size());
    }

    @Transactional
    public void migrateAll() {
        parkingLotRepository.findAll().stream()
                .filter(lot -> !Boolean.TRUE.equals(lot.getArchived()))
                .forEach(lot -> migrate(lot.getId()));
    }

    private FloorSlotMigrationResponse response(ParkingLot lot, int before, int updated) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (int floor = 0; floor < ParkingFloor.floorCount(updated); floor++) {
            int floorIndex = floor;
            counts.put(ParkingFloor.nameOf(floor), (int) parkingSlotRepository.findByParkingLotIdAndArchivedFalse(lot.getId()).stream()
                    .filter(slot -> slot.getFloor() == floorIndex).count());
        }
        return new FloorSlotMigrationResponse(lot.getId(), lot.getName(), before, updated,
                (int) parkingSlotRepository.countByParkingLotIdAndArchivedFalse(lot.getId()), true, counts);
    }

    private int statusCount(Long lotId, SlotStatus status) {
        return (int) parkingSlotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lotId, status);
    }
}
