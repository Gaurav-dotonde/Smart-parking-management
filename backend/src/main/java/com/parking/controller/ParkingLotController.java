package com.parking.controller;

import com.parking.dto.AdminParkingSlotRequest;
import com.parking.dto.AdminParkingSlotResponse;
import com.parking.dto.ParkingLotRequest;
import com.parking.dto.ParkingSlotResponse;
import com.parking.model.ParkingLot;
import com.parking.service.ParkingLotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lots")
@RequiredArgsConstructor
public class ParkingLotController {

    private final ParkingLotService parkingLotService;

    @GetMapping
    public ResponseEntity<List<ParkingLot>> getAllLots() {
        return ResponseEntity.ok(parkingLotService.getAllLots());
    }

    @GetMapping("/active")
    public ResponseEntity<List<ParkingLot>> getActiveLots() {
        return ResponseEntity.ok(parkingLotService.getActiveLots());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParkingLot> getLot(@PathVariable Long id) {
        return ResponseEntity.ok(parkingLotService.getLotById(id));
    }

    @GetMapping("/{id}/slots")
    public ResponseEntity<List<ParkingSlotResponse>> getSlots(@PathVariable Long id) {
        return ResponseEntity.ok(parkingLotService.getSlotsByLot(id));
    }

    @GetMapping("/{id}/slots/admin")
    public ResponseEntity<List<AdminParkingSlotResponse>> getAdminSlots(@PathVariable Long id) {
        return ResponseEntity.ok(parkingLotService.getAdminSlotsByLot(id));
    }

    // Admin only (enforced in SecurityConfig)
    @PostMapping
    public ResponseEntity<ParkingLot> createLot(@Valid @RequestBody ParkingLotRequest request) {
        return ResponseEntity.ok(parkingLotService.createLot(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ParkingLot> updateLot(@PathVariable Long id, @RequestBody ParkingLotRequest request) {
        return ResponseEntity.ok(parkingLotService.updateLot(id, request));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<ParkingLot> archiveLot(@PathVariable Long id) {
        return ResponseEntity.ok(parkingLotService.archiveLot(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ParkingLot> setLotStatus(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(parkingLotService.setLotActive(id, active));
    }

    @PostMapping("/{id}/slots")
    public ResponseEntity<AdminParkingSlotResponse> createSlot(
            @PathVariable Long id,
            @Valid @RequestBody AdminParkingSlotRequest request
    ) {
        request.setLotId(id);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(parkingLotService.createSlot(request));
    }

    @PutMapping("/{lotId}/slots/{slotId}")
    public ResponseEntity<AdminParkingSlotResponse> updateSlot(
            @PathVariable Long lotId,
            @PathVariable Long slotId,
            @Valid @RequestBody AdminParkingSlotRequest request
    ) {
        request.setLotId(lotId);
        return ResponseEntity.ok(parkingLotService.updateSlot(slotId, request));
    }

    @DeleteMapping("/{lotId}/slots/{slotId}")
    public ResponseEntity<Void> deleteSlot(@PathVariable Long lotId, @PathVariable Long slotId) {
        parkingLotService.deleteSlot(slotId);
        return ResponseEntity.noContent().build();
    }
}
