package com.parking.controller;

import com.parking.dto.ChangePasswordRequest;
import com.parking.dto.UserDashboardResponse;
import com.parking.dto.UserProfileResponse;
import com.parking.dto.UserProfileUpdateRequest;
import com.parking.model.User;
import com.parking.service.UserAccountService;
import com.parking.repository.VehicleRepository;
import com.parking.dto.AdminVehicleResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAccountController {

    private final UserAccountService userAccountService;
    private final VehicleRepository vehicleRepository;

    @GetMapping("/me/vehicles")
    @Transactional(readOnly = true)
    public List<AdminVehicleResponse> vehicles(@AuthenticationPrincipal User user) {
        return vehicleRepository.findByOwnerIdAndArchivedFalseAndActiveTrueOrderByCreatedAtDesc(user.getId()).stream()
            .map(v -> new AdminVehicleResponse(v.getId(), v.getOwner().getId(), v.getOwner().getName(),
                v.getOwner().getEmail(), v.getRegistrationNumber(), v.getVehicleType(), v.getBrand(),
                v.getModel(), v.getColor(), v.isActive(), v.isArchived(), v.getArchivedAt(),
                v.getCreatedAt(), v.getUpdatedAt()))
            .toList();
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userAccountService.getCurrentProfile(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMe(@AuthenticationPrincipal User user,
                                                        @Valid @RequestBody UserProfileUpdateRequest request) {
        return ResponseEntity.ok(userAccountService.updateProfile(user, request));
    }

    @PostMapping(value = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileResponse> uploadPhoto(
            @AuthenticationPrincipal User user, @RequestPart("photo") MultipartFile photo) {
        return ResponseEntity.ok(userAccountService.uploadProfilePhoto(user, photo));
    }

    @DeleteMapping("/me/photo")
    public ResponseEntity<UserProfileResponse> deletePhoto(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userAccountService.deleteProfilePhoto(user));
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
