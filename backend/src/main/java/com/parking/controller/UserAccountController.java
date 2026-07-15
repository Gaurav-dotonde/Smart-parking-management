package com.parking.controller;

import com.parking.dto.ChangePasswordRequest;
import com.parking.dto.UserDashboardResponse;
import com.parking.dto.UserProfileResponse;
import com.parking.dto.UserProfileUpdateRequest;
import com.parking.model.User;
import com.parking.service.UserAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAccountController {

    private final UserAccountService userAccountService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userAccountService.getCurrentProfile(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMe(@AuthenticationPrincipal User user,
                                                        @Valid @RequestBody UserProfileUpdateRequest request) {
        return ResponseEntity.ok(userAccountService.updateProfile(user, request));
    }

    @GetMapping("/me/dashboard")
    public ResponseEntity<UserDashboardResponse> dashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userAccountService.getDashboard(user));
    }

    @PutMapping("/me/password")
    public ResponseEntity<UserProfileResponse> changePassword(@AuthenticationPrincipal User user,
                                                              @Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(userAccountService.changePassword(
                user,
                request.getCurrentPassword(),
                request.getNewPassword(),
                request.getConfirmNewPassword()
        ));
    }
}
