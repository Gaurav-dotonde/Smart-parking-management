package com.parking.controller;

import com.parking.dto.AdminBookingResponse;
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
}
