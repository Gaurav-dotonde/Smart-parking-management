package com.parking.controller;

import com.parking.dto.*;
import com.parking.service.AdminVehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/admin/vehicles") @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminVehicleController {
    private final AdminVehicleService service;
    @GetMapping public List<AdminVehicleResponse> list() { return service.list(); }
    @GetMapping("/archived") public List<AdminVehicleResponse> archived() { return service.listArchived(); }
    @GetMapping("/{id}") public AdminVehicleResponse get(@PathVariable Long id) { return service.get(id); }
    @PostMapping public ResponseEntity<AdminVehicleResponse> create(@Valid @RequestBody AdminVehicleRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request)); }
    @PutMapping("/{id}") public AdminVehicleResponse update(@PathVariable Long id, @Valid @RequestBody AdminVehicleRequest request) { return service.update(id, request); }
    @PatchMapping("/{id}/status") public AdminVehicleResponse status(@PathVariable Long id, @RequestParam boolean active) { return service.status(id, active); }
    @PatchMapping("/{id}/activate") public AdminVehicleResponse activate(@PathVariable Long id) { return service.status(id, true); }
    @PatchMapping("/{id}/deactivate") public AdminVehicleResponse deactivate(@PathVariable Long id) { return service.status(id, false); }
    @PatchMapping("/{id}/archive") public AdminVehicleResponse archive(@PathVariable Long id) { return service.archive(id); }
    @PatchMapping("/{id}/restore") public AdminVehicleResponse restore(@PathVariable Long id) { return service.restore(id); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> legacyArchive(@PathVariable Long id) { service.archive(id); return ResponseEntity.noContent().build(); }
}
