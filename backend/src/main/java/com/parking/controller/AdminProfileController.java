package com.parking.controller;

import com.parking.dto.AdminProfileResponse;
import com.parking.dto.AdminProfileUpdateRequest;
import com.parking.dto.ChangePasswordRequest;
import com.parking.dto.ErrorResponse;
import com.parking.service.AdminProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/profile")
@RequiredArgsConstructor
public class AdminProfileController {

    private final AdminProfileService adminProfileService;

    @GetMapping
    public ResponseEntity<AdminProfileResponse> getProfile() {
        return ResponseEntity.ok(adminProfileService.getCurrentAdminProfile());
    }

    @PutMapping
    public ResponseEntity<AdminProfileResponse> updateProfile(@Valid @RequestBody AdminProfileUpdateRequest request) {
        return ResponseEntity.ok(adminProfileService.updateCurrentAdminProfile(request));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ErrorResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        adminProfileService.changePassword(request);
        return ResponseEntity.ok(new ErrorResponse("Password updated successfully."));
    }

    @PostMapping(value = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminProfileResponse> uploadPhoto(@RequestPart("photo") MultipartFile photo) {
        return ResponseEntity.ok(adminProfileService.uploadProfilePhoto(photo));
    }

    @DeleteMapping("/photo")
    public ResponseEntity<AdminProfileResponse> deletePhoto() {
        return ResponseEntity.ok(adminProfileService.deleteProfilePhoto());
    }
}
