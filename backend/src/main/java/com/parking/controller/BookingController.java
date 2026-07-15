package com.parking.controller;

import com.parking.dto.BookingRequest;
import com.parking.dto.BookingResponse;
import com.parking.model.Role;
import com.parking.model.User;
import com.parking.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/book")
    public ResponseEntity<BookingResponse> book(@AuthenticationPrincipal User user,
                                                 @Valid @RequestBody BookingRequest request) {
        return ResponseEntity.ok(bookingService.bookSlot(user, request));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancel(@AuthenticationPrincipal User user,
                                                    @PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelBooking(user, id));
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingResponse>> myBookings(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bookingService.getUserBookings(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> booking(@AuthenticationPrincipal User user,
                                                   @PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getUserBookingById(user, id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BookingResponse>> myBookings(
            @AuthenticationPrincipal User user,
            @PathVariable Long userId
    ) {
        if (user.getRole() != Role.ADMIN && !user.getId().equals(userId)) {
            throw new IllegalStateException("You cannot view another user's bookings");
        }
        return ResponseEntity.ok(bookingService.getUserBookings(userId));
    }
}
