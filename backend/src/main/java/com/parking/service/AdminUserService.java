package com.parking.service;

import com.parking.dto.AdminUserDetailsResponse;
import com.parking.dto.AdminUserRecentBookingResponse;
import com.parking.dto.AdminUserResponse;
import com.parking.dto.AdminUserCreateRequest;
import com.parking.dto.AdminUserUpdateRequest;
import com.parking.model.Booking;
import com.parking.model.BookingStatus;
import com.parking.model.AccountStatus;
import com.parking.model.Role;
import com.parking.model.User;
import com.parking.repository.BookingRepository;
import com.parking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {
    private static final long MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
    private static final List<String> ALLOWED_PHOTO_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AdminUserResponse createUser(AdminUserCreateRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(email)
                .phone(normalizeOptional(request.getPhone()))
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        return toAdminUserResponse(userRepository.save(
                Objects.requireNonNull(user, "user must not be null")));
    }

    @Transactional
    public AdminUserResponse updateUser(Long userId, AdminUserUpdateRequest request) {
        User user = getManagedUser(userId);
        String email = normalizeEmail(request.getEmail());
        userRepository.findByEmail(email)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> { throw new IllegalArgumentException("An account with this email already exists."); });

        AccountStatus status = request.getAccountStatus() == null ? AccountStatus.ACTIVE : request.getAccountStatus();

        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPhone(normalizeOptional(request.getPhone()));
        user.setRole(Role.USER);
        user.setAccountStatus(status);
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        return toAdminUserResponse(userRepository.save(user));
    }

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAllByRoleAndArchivedFalseOrderByCreatedAtDesc(Role.USER)
                .stream()
                .map(this::toAdminUserResponse)
                .collect(Collectors.toList());
    }

    public AdminUserDetailsResponse getUserDetails(Long userId) {
        Long id = Objects.requireNonNull(userId, "userId must not be null");
        User user = getManagedUser(id);

        List<AdminUserRecentBookingResponse> recentBookings = bookingRepository.findTop5ByUserIdOrderByCreatedAtDesc(id)
                .stream()
                .map(this::toRecentBookingResponse)
                .collect(Collectors.toList());

        return new AdminUserDetailsResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                user.getAccountStatus() == null ? AccountStatus.ACTIVE.name() : user.getAccountStatus().name(),
                bookingRepository.countByUserId(id),
                user.getCreatedAt(),
                user.getProfilePhoto(),
                recentBookings
        );
    }

    @Transactional
    public AdminUserDetailsResponse uploadUserPhoto(Long userId, MultipartFile file) {
        User user = getManagedUser(userId);
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Please choose a photo to upload.");
        if (file.getSize() > MAX_PHOTO_SIZE_BYTES) throw new IllegalArgumentException("Profile photo must be 5 MB or smaller.");
        if (file.getContentType() == null || !ALLOWED_PHOTO_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Only JPG, JPEG, PNG, and WEBP files are allowed.");
        }
        try {
            deleteStoredPhoto(user);
            Path uploadDir = resolveUploadRoot().resolve("profile-photos");
            Files.createDirectories(uploadDir);
            String originalName = file.getOriginalFilename();
            String extension = originalName != null && originalName.contains(".")
                    ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : "";
            String fileName = "user-" + user.getId() + "-" + UUID.randomUUID() + extension;
            Files.copy(file.getInputStream(), uploadDir.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
            user.setProfilePhoto("/uploads/profile-photos/" + fileName);
            userRepository.save(user);
            return getUserDetails(userId);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store profile photo.");
        }
    }

    @Transactional
    public AdminUserDetailsResponse deleteUserPhoto(Long userId) {
        User user = getManagedUser(userId);
        deleteStoredPhoto(user);
        user.setProfilePhoto(null);
        userRepository.save(user);
        return getUserDetails(userId);
    }

    private void deleteStoredPhoto(User user) {
        if (user.getProfilePhoto() == null || user.getProfilePhoto().isBlank()) return;
        Path target = resolveUploadRoot()
                .resolve(user.getProfilePhoto().replaceFirst("^/uploads/", "")).normalize();
        try {
            Files.deleteIfExists(target);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to replace existing profile photo.");
        }
    }

    private Path resolveUploadRoot() {
        Path workingDirectory = Paths.get("").toAbsolutePath().normalize();
        return "backend".equalsIgnoreCase(String.valueOf(workingDirectory.getFileName()))
                ? workingDirectory.resolve("uploads")
                : workingDirectory.resolve("backend").resolve("uploads");
    }

    @Transactional
    public AdminUserResponse blockUser(Long userId) {
        Long id = Objects.requireNonNull(userId, "userId must not be null");
        User user = getManagedUser(id);

        if (user.getRole() == Role.ADMIN) {
            throw new IllegalStateException("Admin account cannot be blocked");
        }

        user.setAccountStatus(AccountStatus.BLOCKED);
        userRepository.save(Objects.requireNonNull(user, "user must not be null"));
        return toAdminUserResponse(user);
    }

    @Transactional
    public AdminUserResponse unblockUser(Long userId) {
        Long id = Objects.requireNonNull(userId, "userId must not be null");
        User user = getManagedUser(id);

        user.setAccountStatus(AccountStatus.ACTIVE);
        userRepository.save(Objects.requireNonNull(user, "user must not be null"));
        return toAdminUserResponse(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        Long id = Objects.requireNonNull(userId, "userId must not be null");
        User user = getManagedUser(id);

        if (user.getRole() == Role.ADMIN && userRepository.countByRoleAndArchivedFalse(Role.ADMIN) <= 1) {
            throw new IllegalStateException("The last admin account cannot be archived.");
        }

        long activeBookings = bookingRepository.countByUserIdAndStatusIn(
                id,
                Arrays.asList(BookingStatus.PENDING, BookingStatus.ACTIVE)
        );

        if (activeBookings > 0) {
            throw new IllegalStateException("This user cannot be archived because they have active bookings.");
        }
        user.setArchived(true);
        user.setArchivedAt(java.time.LocalDateTime.now());
        user.setAccountStatus(AccountStatus.INACTIVE);
        userRepository.save(Objects.requireNonNull(user, "user must not be null"));
    }

    private AdminUserResponse toAdminUserResponse(User user) {
        Objects.requireNonNull(user, "user must not be null");
        AccountStatus status = user.getAccountStatus() == null ? AccountStatus.ACTIVE : user.getAccountStatus();
        return new AdminUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().name(),
                bookingRepository.countByUserId(user.getId()),
                status.name(),
                user.getCreatedAt()
        );
    }

    private AdminUserRecentBookingResponse toRecentBookingResponse(Booking booking) {
        Objects.requireNonNull(booking, "booking must not be null");
        return new AdminUserRecentBookingResponse(
                booking.getId(),
                booking.getSlot().getSlotNumber(),
                booking.getVehicleNumber() == null || booking.getVehicleNumber().isBlank() ? "N/A" : booking.getVehicleNumber(),
                booking.getStatus().name(),
                booking.getStartTime(),
                booking.getEndTime()
        );
    }

    private User getManagedUser(Long userId) {
        return userRepository.findById(Objects.requireNonNull(userId, "userId must not be null"))
                .filter(user -> user.getRole() == Role.USER)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private String normalizeEmail(String email) {
        return Objects.requireNonNull(email, "email must not be null").trim().toLowerCase();
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
