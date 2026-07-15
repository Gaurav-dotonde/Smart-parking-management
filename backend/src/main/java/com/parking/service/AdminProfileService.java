package com.parking.service;

import com.parking.dto.AdminProfileResponse;
import com.parking.dto.AdminProfileUpdateRequest;
import com.parking.dto.ChangePasswordRequest;
import com.parking.model.Role;
import com.parking.model.User;
import com.parking.model.AccountStatus;
import com.parking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminProfileService {

    private static final long MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminProfileResponse getCurrentAdminProfile() {
        return toResponse(getCurrentAdmin());
    }

    @Transactional
    public AdminProfileResponse updateCurrentAdminProfile(AdminProfileUpdateRequest request) {
        User admin = getCurrentAdmin();
        admin.setName(request.getName().trim());
        admin.setPhone(request.getPhone().trim());
        return toResponse(userRepository.save(admin));
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User admin = getCurrentAdmin();

        if (!passwordEncoder.matches(request.getCurrentPassword(), admin.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new IllegalArgumentException("New password and confirm password do not match.");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new IllegalArgumentException("New password must not be the same as the current password.");
        }

        admin.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(admin);
    }

    @Transactional
    public AdminProfileResponse uploadProfilePhoto(MultipartFile file) {
        User admin = getCurrentAdmin();
        validatePhoto(file);

        Path uploadDir = Paths.get("backend", "uploads", "profile-photos").toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadDir);
            deleteExistingPhotoIfPresent(admin);

            String extension = getExtension(file.getOriginalFilename());
            String fileName = "admin-" + admin.getId() + "-" + UUID.randomUUID() + extension;
            Path targetPath = uploadDir.resolve(fileName);

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            admin.setProfilePhoto("/uploads/profile-photos/" + fileName);
            return toResponse(userRepository.save(admin));
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store profile photo.");
        }
    }

    @Transactional
    public AdminProfileResponse deleteProfilePhoto() {
        User admin = getCurrentAdmin();
        deleteExistingPhotoIfPresent(admin);
        admin.setProfilePhoto(null);
        return toResponse(userRepository.save(admin));
    }

    @Transactional
    public void markSuccessfulLogin(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    private void validatePhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please choose a photo to upload.");
        }

        if (file.getSize() > MAX_PHOTO_SIZE_BYTES) {
            throw new IllegalArgumentException("Profile photo must be 5 MB or smaller.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPG, JPEG, PNG, and WEBP files are allowed.");
        }
    }

    private void deleteExistingPhotoIfPresent(User admin) {
        if (admin.getProfilePhoto() == null || admin.getProfilePhoto().isBlank()) {
            return;
        }

        String relativePath = admin.getProfilePhoto().replaceFirst("^/uploads/", "");
        Path targetPath = Paths.get("backend", "uploads").toAbsolutePath().normalize().resolve(relativePath).normalize();

        try {
            Files.deleteIfExists(targetPath);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to replace existing profile photo.");
        }
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    }

    private User getCurrentAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new IllegalStateException("Admin authentication is required.");
        }

        if (user.getRole() != Role.ADMIN) {
            throw new IllegalStateException("Only admin accounts can access this profile.");
        }

        Long userId = Objects.requireNonNull(user.getId(), "Admin account id is required.");
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Admin account not found."));
    }

    private AdminProfileResponse toResponse(User user) {
        AccountStatus status = user.getAccountStatus() == null ? AccountStatus.ACTIVE : user.getAccountStatus();
        return new AdminProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                status.name(),
                user.getCreatedAt(),
                user.getLastLogin(),
                user.getProfilePhoto()
        );
    }
}
