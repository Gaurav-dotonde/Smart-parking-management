package com.parking.service;

import com.parking.dto.AdminUserDetailsResponse;
import com.parking.dto.AdminUserRecentBookingResponse;
import com.parking.dto.AdminUserResponse;
import com.parking.model.Booking;
import com.parking.model.BookingStatus;
import com.parking.model.AccountStatus;
import com.parking.model.Role;
import com.parking.model.User;
import com.parking.repository.BookingRepository;
import com.parking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toAdminUserResponse)
                .collect(Collectors.toList());
    }

    public AdminUserDetailsResponse getUserDetails(Long userId) {
        Long id = Objects.requireNonNull(userId, "userId must not be null");
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

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
                recentBookings
        );
    }

    @Transactional
    public AdminUserResponse blockUser(Long userId) {
        Long id = Objects.requireNonNull(userId, "userId must not be null");
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

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
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setAccountStatus(AccountStatus.ACTIVE);
        userRepository.save(Objects.requireNonNull(user, "user must not be null"));
        return toAdminUserResponse(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        Long id = Objects.requireNonNull(userId, "userId must not be null");
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        long activeBookings = bookingRepository.countByUserIdAndStatusIn(
                id,
                Arrays.asList(BookingStatus.PENDING, BookingStatus.ACTIVE)
        );

        if (activeBookings > 0) {
            throw new IllegalStateException("This user cannot be deleted because they have active bookings.");
        }

        userRepository.delete(Objects.requireNonNull(user, "user must not be null"));
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
}
