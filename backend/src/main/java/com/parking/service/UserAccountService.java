package com.parking.service;

import com.parking.dto.BookingResponse;
import com.parking.dto.UserDashboardResponse;
import com.parking.dto.UserProfileResponse;
import com.parking.dto.UserProfileUpdateRequest;
import com.parking.model.Booking;
import com.parking.model.BookingStatus;
import com.parking.model.PaymentStatus;
import com.parking.model.User;
import com.parking.repository.BookingRepository;
import com.parking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAccountService {
    private static final long MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
    private static final List<String> ALLOWED_PHOTO_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final PasswordEncoder passwordEncoder;

    public UserProfileResponse getCurrentProfile(User user) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        return toProfileResponse(safeUser);
    }

    @Transactional
    public UserProfileResponse updateProfile(User user, UserProfileUpdateRequest request) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        UserProfileUpdateRequest safeRequest = Objects.requireNonNull(request, "request must not be null");

        if (safeRequest.getName() != null && !safeRequest.getName().isBlank()) {
            safeUser.setName(safeRequest.getName().trim());
        }
        if (safeRequest.getPhone() != null && !safeRequest.getPhone().isBlank()) {
            safeUser.setPhone(safeRequest.getPhone().trim());
        }
        if (safeRequest.getVehicleNumber() != null) {
            safeUser.setVehicleNumber(safeRequest.getVehicleNumber().trim());
        }

        return toProfileResponse(userRepository.save(safeUser));
    }

    public UserDashboardResponse getDashboard(User user) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        List<Booking> bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(safeUser.getId());
        LocalDateTime now = LocalDateTime.now();

        long active = bookings.stream().filter(b -> b.getStatus() == BookingStatus.ACTIVE).count();
        long upcoming = bookings.stream().filter(b -> b.getStatus() == BookingStatus.PENDING && b.getStartTime().isAfter(now)).count();
        long completed = bookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
        long cancelled = bookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();
        long totalPayments = bookings.stream().filter(b -> b.getPaymentStatus() == PaymentStatus.PAID).count();
        long pendingPayments = bookings.stream().filter(b -> b.getPaymentStatus() == PaymentStatus.UNPAID).count();

        List<BookingResponse> recent = bookings.stream().limit(5).map(this::toBookingResponse).collect(Collectors.toList());
        return new UserDashboardResponse(active, upcoming, completed, cancelled, totalPayments, pendingPayments, recent);
    }

    @Transactional
    public UserProfileResponse changePassword(User user, String currentPassword, String newPassword, String confirmPassword) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        if (currentPassword == null || newPassword == null || confirmPassword == null) {
            throw new IllegalArgumentException("All password fields are required.");
        }
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("New password and confirm password do not match.");
        }
        if (!passwordEncoder.matches(currentPassword, safeUser.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        safeUser.setPassword(passwordEncoder.encode(newPassword));
        return toProfileResponse(userRepository.save(safeUser));
    }

    @Transactional
    public UserProfileResponse uploadProfilePhoto(User user, MultipartFile file) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Please choose a photo to upload.");
        if (file.getSize() > MAX_PHOTO_SIZE_BYTES) throw new IllegalArgumentException("Profile photo must be 5 MB or smaller.");
        if (file.getContentType() == null || !ALLOWED_PHOTO_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Only JPG, JPEG, PNG, and WEBP files are allowed.");
        }
        try {
            deleteStoredPhoto(safeUser);
            Path uploadDir = resolveUploadRoot().resolve("profile-photos");
            Files.createDirectories(uploadDir);
            String original = file.getOriginalFilename();
            String extension = original != null && original.contains(".")
                    ? original.substring(original.lastIndexOf('.')).toLowerCase() : "";
            String fileName = "user-" + safeUser.getId() + "-" + UUID.randomUUID() + extension;
            Files.copy(file.getInputStream(), uploadDir.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
            safeUser.setProfilePhoto("/uploads/profile-photos/" + fileName);
            return toProfileResponse(userRepository.save(safeUser));
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store profile photo.");
        }
    }

    @Transactional
    public UserProfileResponse deleteProfilePhoto(User user) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        deleteStoredPhoto(safeUser);
        safeUser.setProfilePhoto(null);
        return toProfileResponse(userRepository.save(safeUser));
    }

    private void deleteStoredPhoto(User user) {
        if (user.getProfilePhoto() == null || user.getProfilePhoto().isBlank()) return;
        try {
            Files.deleteIfExists(resolveUploadRoot()
                    .resolve(user.getProfilePhoto().replaceFirst("^/uploads/", "")).normalize());
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

    private UserProfileResponse toProfileResponse(User user) {
        String accountStatus = (user.getAccountStatus() == null ? "ACTIVE" : user.getAccountStatus().name());
        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getVehicleNumber(),
                user.getRole().name(),
                accountStatus,
                user.getProfilePhoto(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getLastLogin()
        );
    }

    private BookingResponse toBookingResponse(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getSlot().getSlotNumber(),
                booking.getSlot().getParkingLot().getName(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getStatus().name(),
                booking.getPaymentStatus() == null ? PaymentStatus.UNPAID.name() : booking.getPaymentStatus().name(),
                booking.getVehicleNumber(),
                booking.getSlot().getVehicleType(),
                booking.getAmount(),
                booking.getCheckedInAt(), booking.getCheckedOutAt(),
                Boolean.TRUE.equals(booking.getOverstay()),
                Boolean.TRUE.equals(booking.getExtended()),
                booking.getExtensionCount() == null ? 0 : booking.getExtensionCount(),
                booking.getOriginalEndTime(), ""
        );
    }
}
