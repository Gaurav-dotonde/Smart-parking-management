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
    @GetMapping("/{id}") public AdminVehicleResponse get(@PathVariable Long id) { return service.get(id); }
    @PostMapping public ResponseEntity<AdminVehicleResponse> create(@Valid @RequestBody AdminVehicleRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request)); }
    @PutMapping("/{id}") public AdminVehicleResponse update(@PathVariable Long id, @Valid @RequestBody AdminVehicleRequest request) { return service.update(id, request); }
    @PatchMapping("/{id}/status") public AdminVehicleResponse status(@PathVariable Long id, @RequestParam boolean active) { return service.status(id, active); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> archive(@PathVariable Long id) { service.archive(id); return ResponseEntity.noContent().build(); }
}
