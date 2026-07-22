package com.parking.controller;

import com.parking.dto.AdminParkingSlotResponse;
import com.parking.dto.BulkParkingSlotRequest;
import com.parking.dto.BulkParkingSlotResponse;
import com.parking.dto.FloorSlotMigrationResponse;
import com.parking.dto.ParkingSlotPageResponse;
import com.parking.dto.ParkingSlotSummaryResponse;
import com.parking.service.ParkingLotService;
import com.parking.service.ParkingSlotLayoutMigrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminParkingSlotController {
    private final ParkingLotService parkingLotService;
    private final ParkingSlotLayoutMigrationService layoutMigrationService;

    @GetMapping("/parking-slots")
    public List<AdminParkingSlotResponse> getAllSlots() { return parkingLotService.getAllAdminSlots(); }

    @GetMapping("/parking-slots/{id}")
    public AdminParkingSlotResponse getSlot(@PathVariable Long id) { return parkingLotService.getAdminSlot(id); }

    @PutMapping("/parking-slots/{id}/status")
    public AdminParkingSlotResponse setStatus(@PathVariable Long id, @RequestParam String status) { return parkingLotService.setSlotStatus(id, status); }

    @PutMapping("/parking-slots/{id}/archive")
    public void archive(@PathVariable Long id) { parkingLotService.deleteSlot(id); }

    @PostMapping("/parking-lots/{lotId}/slots/bulk")
    public BulkParkingSlotResponse bulkCreate(@PathVariable Long lotId, @Valid @RequestBody BulkParkingSlotRequest request) {
        return parkingLotService.bulkCreateSlots(lotId, request);
    }

    @PostMapping("/parking-lots/{lotId}/slots/migrate-floor-layout")
    public FloorSlotMigrationResponse migrateFloorLayout(@PathVariable Long lotId) {
        return layoutMigrationService.migrate(lotId);
    }

    @GetMapping("/parking-lots/{lotId}/slots/summary")
    public ParkingSlotSummaryResponse getSlotSummary(@PathVariable Long lotId) {
        return parkingLotService.getSlotSummary(lotId);
    }

    /** Location-scoped alias used by scalable admin clients. */
    @GetMapping("/slots/summary")
    public ParkingSlotSummaryResponse getSlotSummaryByLocation(@RequestParam(required = false) Long locationId) {
        return locationId == null ? parkingLotService.getAllSlotSummary() : parkingLotService.getSlotSummary(locationId);
    }

    @GetMapping("/parking-lots/{lotId}/slots")
    public ParkingSlotPageResponse getSlotsPaged(
            @PathVariable Long lotId,
            @PageableDefault(size = 25) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String vehicleType,
            @RequestParam(required = false) String slotType,
            @RequestParam(required = false) String status
    ) {
        var spec = parkingLotService.buildSlotSpecification(search, floor, zone, vehicleType, slotType, status);
        return parkingLotService.getAdminSlotsByLotPaged(lotId, pageable, spec);
    }

    /** Loads a single location page at a time; no cross-location slot preload is required. */
    @GetMapping("/slots")
    public ParkingSlotPageResponse getSlotsPagedByLocation(
            @RequestParam(required = false) Long locationId,
            @PageableDefault(size = 25) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String vehicleType,
            @RequestParam(required = false) String slotType,
            @RequestParam(required = false) String status
    ) {
        var spec = parkingLotService.buildSlotSpecification(search, floor, zone, vehicleType, slotType, status);
        return locationId == null
                ? parkingLotService.getAllAdminSlotsPaged(pageable, spec)
                : parkingLotService.getAdminSlotsByLotPaged(locationId, pageable, spec);
    }
}
