package com.parking.controller;

import com.parking.dto.AdminBookingResponse;
import com.parking.dto.BookingExtensionRequest;
import com.parking.dto.BookingExtensionResponse;
import com.parking.model.ExtendedBy;
import jakarta.validation.Valid;
import com.parking.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/bookings")
@RequiredArgsConstructor
public class AdminBookingController {

    private final BookingService bookingService;

    @GetMapping
    public ResponseEntity<List<AdminBookingResponse>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllAdminBookings());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminBookingResponse> getBookingById(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getAdminBookingById(id));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<AdminBookingResponse> cancelBooking(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelBookingAsAdmin(id));
    }

    @PutMapping("/{id}/approve")
    public AdminBookingResponse approve(@PathVariable Long id) { return bookingService.transitionAsAdmin(id, "APPROVE"); }

    @PutMapping("/{id}/check-in")
    public AdminBookingResponse checkIn(@PathVariable Long id) { return bookingService.transitionAsAdmin(id, "CHECK_IN"); }

    @PutMapping("/{id}/check-out")
    public AdminBookingResponse checkOut(@PathVariable Long id) { return bookingService.transitionAsAdmin(id, "CHECK_OUT"); }

    @PutMapping("/{id}/complete")
    public AdminBookingResponse complete(@PathVariable Long id) { return bookingService.transitionAsAdmin(id, "COMPLETE"); }

    @PostMapping("/{id}/extend")
    public BookingExtensionResponse extend(@PathVariable Long id, @Valid @RequestBody BookingExtensionRequest request) {
        return bookingService.extendBooking(null, id, request, ExtendedBy.ADMIN);
    }
}
