package com.parking.service;

import com.parking.dto.*;
import com.parking.model.Booking;
import com.parking.model.BookingStatus;
import com.parking.model.PaymentStatus;
import com.parking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminReportsService {

    private final BookingRepository bookingRepository;

    public ReportsSummaryResponse getSummary(LocalDate fromDate, LocalDate toDate) {
      List<Booking> bookings = getFilteredBookings(fromDate, toDate);
      List<Booking> revenueBookings = bookings.stream().filter(this::countsAsRevenue).toList();

      double totalRevenue = revenueBookings.stream()
              .filter(Objects::nonNull)
              .mapToDouble(booking -> {
                Double amount = booking.getAmount();
                return amount != null ? amount : 0.0;
              })
              .sum();
      double averageAmount = revenueBookings.isEmpty() ? 0 : totalRevenue / revenueBookings.size();

      return new ReportsSummaryResponse(
              bookings.size(),
              bookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count(),
              bookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count(),
              totalRevenue,
              averageAmount
      );
    }

    public ReportsBookingStatusResponse getBookingStatus(LocalDate fromDate, LocalDate toDate) {
      List<Booking> bookings = getFilteredBookings(fromDate, toDate);
      return new ReportsBookingStatusResponse(
              bookings.stream().filter(b -> b.getStatus() == BookingStatus.ACTIVE).count(),
              bookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count(),
              bookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count()
      );
    }

    public ReportsRevenueResponse getRevenue(LocalDate fromDate, LocalDate toDate) {
      List<Booking> bookings = getFilteredBookings(fromDate, toDate).stream().filter(this::countsAsRevenue).toList();
      LocalDate today = LocalDate.now();
      LocalDate weekStart = today.minusDays(6);
      LocalDate monthStart = today.withDayOfMonth(1);

      double daily = bookings.stream()
              .filter(b -> b.getCreatedAt().toLocalDate().isEqual(today))
              .mapToDouble(booking -> {
                Double amount = booking.getAmount();
                return amount != null ? amount : 0.0;
              })
              .sum();
      double weekly = bookings.stream()
              .filter(b -> !b.getCreatedAt().toLocalDate().isBefore(weekStart) && !b.getCreatedAt().toLocalDate().isAfter(today))
              .mapToDouble(booking -> {
                Double amount = booking.getAmount();
                return amount != null ? amount : 0.0;
              })
              .sum();
      double monthly = bookings.stream()
              .filter(b -> !b.getCreatedAt().toLocalDate().isBefore(monthStart) && !b.getCreatedAt().toLocalDate().isAfter(today))
              .mapToDouble(booking -> {
                Double amount = booking.getAmount();
                return amount != null ? amount : 0.0;
              })
              .sum();

      return new ReportsRevenueResponse(daily, weekly, monthly);
    }

    public List<ReportsTopSlotResponse> getTopSlots(LocalDate fromDate, LocalDate toDate) {
      List<Booking> bookings = getFilteredBookings(fromDate, toDate);
      Map<Long, List<Booking>> grouped = bookings.stream()
              .collect(Collectors.groupingBy(b -> b.getSlot().getId()));

      List<ReportsTopSlotResponse> rows = new ArrayList<>();
      grouped.values().stream()
              .sorted(Comparator.<List<Booking>>comparingInt(list -> list == null ? 0 : list.size()).reversed())
              .limit(5)
              .forEach(slotBookings -> {
                Booking first = slotBookings.get(0);
                rows.add(new ReportsTopSlotResponse(
                        rows.size() + 1L,
                        first.getSlot().getSlotNumber(),
                        first.getSlot().getFloor(),
                        first.getSlot().getVehicleType(),
                        slotBookings.size(),
                        slotBookings.stream()
                                .filter(this::countsAsRevenue)
                                .mapToDouble(booking -> {
                                  Double amount = booking.getAmount();
                                  return amount != null ? amount : 0.0;
                                })
                                .sum()
                ));
              });
      return rows;
    }

    public List<ReportsBookingRowResponse> getBookings(LocalDate fromDate, LocalDate toDate) {
      return getFilteredBookings(fromDate, toDate).stream()
              .map(booking -> new ReportsBookingRowResponse(
                      booking.getId(),
                      booking.getUser().getName(),
                      booking.getSlot().getSlotNumber(),
                      booking.getVehicleNumber() == null || booking.getVehicleNumber().isBlank() ? "N/A" : booking.getVehicleNumber(),
                      booking.getCreatedAt(),
                      Math.max(1, Duration.between(booking.getStartTime(), booking.getEndTime()).toHours()),
                      booking.getStatus().name(),
                      booking.getPaymentStatus() == null ? PaymentStatus.UNPAID.name() : booking.getPaymentStatus().name(),
                      booking.getAmount()
              ))
              .toList();
    }

    private List<Booking> getFilteredBookings(LocalDate fromDate, LocalDate toDate) {
      LocalDateTime from = fromDate != null ? fromDate.atStartOfDay() : LocalDate.of(2000, 1, 1).atStartOfDay();
      LocalDateTime to = toDate != null ? toDate.atTime(23, 59, 59) : LocalDateTime.now().plusYears(20);
      return Objects.requireNonNull(
              bookingRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(from, to),
              "booking list must not be null"
      );
    }

    private boolean countsAsRevenue(Booking booking) {
      Objects.requireNonNull(booking, "booking must not be null");
      boolean validStatus = booking.getStatus() == BookingStatus.ACTIVE || booking.getStatus() == BookingStatus.COMPLETED;
      boolean validPayment = booking.getPaymentStatus() == PaymentStatus.PAID;
      return validStatus && validPayment;
    }
}
