package com.parking.controller;

import com.parking.dto.UserFindParkingQuery;
import com.parking.dto.UserFindParkingResponse;
import com.parking.model.Role;
import com.parking.model.User;
import com.parking.service.ParkingLotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserParkingController {

    private final ParkingLotService parkingLotService;

    @GetMapping("/find-parking")
    public ResponseEntity<List<UserFindParkingResponse>> findParking(
            @AuthenticationPrincipal User user,
            @Valid @ModelAttribute UserFindParkingQuery query
    ) {
        if (user.getRole() != Role.USER) {
            throw new IllegalStateException("Only user accounts can search parking slots.");
        }
        return ResponseEntity.ok(parkingLotService.findAvailableSlots(query));
    }
}
