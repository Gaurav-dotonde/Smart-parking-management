package com.parking.controller;

import com.parking.dto.AdminUserDetailsResponse;
import com.parking.dto.AdminUserResponse;
import com.parking.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminUserDetailsResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserService.getUserDetails(id));
    }

    @PutMapping("/{id}/block")
    public ResponseEntity<AdminUserResponse> blockUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserService.blockUser(id));
    }

    @PutMapping("/{id}/unblock")
    public ResponseEntity<AdminUserResponse> unblockUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminUserService.unblockUser(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
