package com.parking.service;

import com.parking.dto.AdminBookingResponse;
import com.parking.dto.AdminDashboardResponse;
import com.parking.model.Booking;
import com.parking.model.BookingStatus;
import com.parking.model.ParkingLot;
import com.parking.model.ParkingSlot;
import com.parking.model.PaymentStatus;
import com.parking.model.Role;
import com.parking.model.SlotStatus;
import com.parking.model.User;
import com.parking.repository.BookingRepository;
import com.parking.repository.ParkingLotRepository;
import com.parking.repository.ParkingSlotRepository;
import com.parking.repository.UserRepository;
import com.parking.repository.VehicleRepository;
import com.parking.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private static final int RECENT_LIMIT = 5;

    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {
        List<ParkingLot> lots = parkingLotRepository.findAll();
        List<ParkingSlot> slots = parkingSlotRepository.findAll().stream()
                .filter(slot -> !Boolean.TRUE.equals(slot.getArchived()))
                .toList();
        List<Booking> bookings = bookingRepository.findAllByOrderByCreatedAtDesc();
        List<User> users = userRepository.findAllByArchivedFalseOrderByCreatedAtDesc();

        Map<SlotStatus, Long> slotCounts = slots.stream()
                .collect(Collectors.groupingBy(slot -> slot.getStatus(), Collectors.counting()));
        Map<BookingStatus, Long> bookingCounts = bookings.stream()
                .collect(Collectors.groupingBy(booking -> booking.getStatus(), Collectors.counting()));

        Set<String> vehicles = new java.util.HashSet<>();
        vehicleRepository.findAllByArchivedFalseOrderByCreatedAtDesc().stream()
                .map(vehicle -> normalizeVehicle(vehicle.getRegistrationNormalized()))
                .filter(vehicleNumber -> vehicleNumber != null)
                .forEach(vehicles::add);
        users.stream()
                .map(user -> user.getVehicleNumber())
                .map(vehicleNumber -> normalizeVehicle(vehicleNumber))
                .filter(vehicleNumber -> vehicleNumber != null)
                .forEach(vehicleNumber -> vehicles.add(vehicleNumber));
        bookings.stream()
                .map(booking -> booking.getVehicleNumber())
                .map(vehicleNumber -> normalizeVehicle(vehicleNumber))
                .filter(vehicleNumber -> vehicleNumber != null)
                .forEach(vehicleNumber -> vehicles.add(vehicleNumber));

        LocalDate today = LocalDate.now();
        long todayBookings = bookings.stream()
                .filter(booking -> booking.getStartTime() != null && booking.getStartTime().toLocalDate().equals(today))
                .count();

        List<com.parking.model.Payment> paymentRecords = paymentRepository.findAllByOrderByCreatedAtDesc();
        BigDecimal totalRevenue = paymentRecords.isEmpty() ? bookings.stream()
                .filter(booking -> booking.getPaymentStatus() == PaymentStatus.PAID)
                .map(booking -> booking.getAmount())
                .filter(amount -> amount != null)
                .map(amount -> BigDecimal.valueOf(amount.doubleValue()))
                .reduce(BigDecimal.ZERO, (total, amount) -> total.add(amount))
                .setScale(2, RoundingMode.HALF_UP) : paymentRecords.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.PAID || payment.getStatus() == PaymentStatus.PARTIALLY_REFUNDED)
                .map(payment -> payment.getAmount().subtract(payment.getRefundAmount() == null ? BigDecimal.ZERO : payment.getRefundAmount()))
                .reduce(BigDecimal.ZERO, (total, amount) -> total.add(amount))
                .setScale(2, RoundingMode.HALF_UP);

        List<AdminBookingResponse> recentBookings = bookings.stream()
                .limit(RECENT_LIMIT)
                .map(booking -> toBookingResponse(booking))
                .toList();

        List<AdminDashboardResponse.RecentUser> recentUsers = users.stream()
                .filter(user -> user.getRole() == Role.USER)
                .limit(RECENT_LIMIT)
                .map(user -> new AdminDashboardResponse.RecentUser(
                        user.getId(), user.getName(), user.getEmail(),
                        user.getAccountStatus() == null ? "ACTIVE" : user.getAccountStatus().name(),
                        user.getCreatedAt()))
                .toList();

        List<AdminDashboardResponse.RecentPayment> recentPayments = paymentRecords.isEmpty() ? bookings.stream()
                .filter(booking -> booking.getPaymentStatus() != null)
                .limit(RECENT_LIMIT)
                .map(booking -> new AdminDashboardResponse.RecentPayment(
                        booking.getId(),
                        "BOOKING-" + booking.getId(),
                        booking.getUser().getName(),
                        booking.getVehicleNumber(),
                        money(booking.getAmount()),
                        booking.getPaymentStatus().name(),
                        booking.getCreatedAt()))
                .toList() : paymentRecords.stream().limit(RECENT_LIMIT).map(payment -> new AdminDashboardResponse.RecentPayment(
                        payment.getBooking().getId(), payment.getTransactionReference(), payment.getBooking().getUser().getName(),
                        payment.getBooking().getVehicleNumber(), payment.getAmount(), payment.getStatus().name(),
                        payment.getPaymentDate() == null ? payment.getCreatedAt() : payment.getPaymentDate())).toList();

        Map<Long, List<ParkingSlot>> slotsByLot = slots.stream()
                .collect(Collectors.groupingBy(slot -> slot.getParkingLot().getId()));
        List<AdminDashboardResponse.LocationOccupancy> occupancy = lots.stream()
                .sorted((left, right) -> String.CASE_INSENSITIVE_ORDER.compare(left.getName(), right.getName()))
                .map(lot -> {
                    List<ParkingSlot> lotSlots = slotsByLot.getOrDefault(lot.getId(), List.of());
                    long available = lotSlots.stream().filter(slot -> slot.getStatus() == SlotStatus.AVAILABLE).count();
                    long unavailable = lotSlots.size() - available;
                    double percentage = lotSlots.isEmpty() ? 0 : Math.round(unavailable * 1000.0 / lotSlots.size()) / 10.0;
                    return new AdminDashboardResponse.LocationOccupancy(
                            lot.getId(), lot.getName(), lotSlots.size(), available, unavailable, percentage);
                })
                .toList();

        Map<LocalDate, BigDecimal> revenueByDate = new LinkedHashMap<>();
        for (int day = 6; day >= 0; day--) revenueByDate.put(today.minusDays(day), BigDecimal.ZERO);
        bookings.stream()
                .filter(booking -> booking.getPaymentStatus() == PaymentStatus.PAID && booking.getCreatedAt() != null)
                .filter(booking -> revenueByDate.containsKey(booking.getCreatedAt().toLocalDate()))
                .forEach(booking -> revenueByDate.computeIfPresent(
                        booking.getCreatedAt().toLocalDate(), (date, amount) -> amount.add(money(booking.getAmount()))));
        List<AdminDashboardResponse.RevenuePoint> revenueOverview = new ArrayList<>();
        revenueByDate.forEach((date, amount) -> revenueOverview.add(
                new AdminDashboardResponse.RevenuePoint(date, amount.setScale(2, RoundingMode.HALF_UP))));

        return new AdminDashboardResponse(
                lots.size(), slots.size(),
                slotCounts.getOrDefault(SlotStatus.AVAILABLE, 0L),
                slotCounts.getOrDefault(SlotStatus.BOOKED, 0L),
                slotCounts.getOrDefault(SlotStatus.RESERVED, 0L),
                slotCounts.getOrDefault(SlotStatus.OCCUPIED, 0L),
                slotCounts.getOrDefault(SlotStatus.MAINTENANCE, 0L),
                slotCounts.getOrDefault(SlotStatus.DISABLED, 0L),
                users.stream().filter(user -> user.getRole() == Role.USER).count(),
                vehicles.size(),
                bookingCounts.getOrDefault(BookingStatus.ACTIVE, 0L) + bookingCounts.getOrDefault(BookingStatus.PENDING, 0L)
                        + bookingCounts.getOrDefault(BookingStatus.APPROVED, 0L) + bookingCounts.getOrDefault(BookingStatus.RESERVED, 0L)
                        + bookingCounts.getOrDefault(BookingStatus.OCCUPIED, 0L),
                bookingCounts.getOrDefault(BookingStatus.COMPLETED, 0L),
                bookingCounts.getOrDefault(BookingStatus.CANCELLED, 0L),
                todayBookings, totalRevenue, recentBookings, recentUsers, recentPayments, occupancy, revenueOverview);
    }

    private AdminBookingResponse toBookingResponse(Booking booking) {
        return new AdminBookingResponse(
                booking.getId(), booking.getUser().getName(), booking.getUser().getEmail(),
                booking.getSlot().getParkingLot().getName(), booking.getSlot().getSlotNumber(),
                booking.getSlot().getFloor(), booking.getVehicleNumber(), booking.getStartTime(), booking.getEndTime(),
                booking.getStatus().name(),
                booking.getPaymentStatus() == null ? PaymentStatus.UNPAID.name() : booking.getPaymentStatus().name(),
                booking.getAmount());
    }

    private String normalizeVehicle(String value) {
        if (value == null || value.isBlank()) return null;
        return value.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    }

    private BigDecimal money(Double value) {
        return value == null ? BigDecimal.ZERO : BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
