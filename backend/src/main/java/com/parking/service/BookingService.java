package com.parking.service;

import com.parking.dto.AdminBookingResponse;
import com.parking.dto.BookingRequest;
import com.parking.dto.BookingResponse;
import com.parking.model.*;
import com.parking.repository.BookingRepository;
import com.parking.repository.ParkingSlotRepository;
import com.parking.repository.ParkingLotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingLotRepository parkingLotRepository;

    /**
     * Concurrency-safe slot booking.
     *
     * Problem: two users click "book" on the same slot at (almost) the same time.
     * Without locking, both requests could read status=AVAILABLE before either
     * writes back, and both would succeed -> double booking.
     *
     * Fix: PESSIMISTIC_WRITE row lock (SELECT ... FOR UPDATE) on the slot row.
     * The first transaction to reach this line locks the row; the second
     * transaction blocks until the first commits/rolls back, then re-reads
     * the now-updated status and correctly fails with "slot already booked".
     *
     * @Transactional ensures the read-check-write sequence is atomic.
     */
    @Transactional
    public BookingResponse bookSlot(User user, BookingRequest request) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        BookingRequest safeRequest = Objects.requireNonNull(request, "request must not be null");

        if (!safeRequest.getEndTime().isAfter(safeRequest.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(
                        Objects.requireNonNull(safeRequest.getSlotId(), "slotId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Slot not found"));

        if (slot.getParkingLot() == null || !Boolean.TRUE.equals(slot.getParkingLot().getActive())) {
            throw new IllegalStateException("Selected parking lot is not available for booking");
        }

        if (slot.getStatus() != SlotStatus.AVAILABLE) {
            throw new IllegalStateException("Slot " + slot.getSlotNumber() + " is already booked");
        }

        long durationMinutes = Math.max(1, Duration.between(safeRequest.getStartTime(), safeRequest.getEndTime()).toMinutes());
        long days = Math.max(1, (long) Math.ceil(durationMinutes / 1440.0));
        double amount = days * slot.getParkingLot().getPricePerDay();

        slot.setStatus(SlotStatus.BOOKED);
        parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null"));
        synchronizeLot(slot);

        Booking booking = Booking.builder()
                .user(safeUser)
                .slot(slot)
                .startTime(safeRequest.getStartTime())
                .endTime(safeRequest.getEndTime())
                .vehicleNumber(safeRequest.getVehicleNumber())
                .status(BookingStatus.ACTIVE)
                .amount(amount)
                .paymentStatus(PaymentStatus.PAID)
                .build();

        booking = bookingRepository.save(Objects.requireNonNull(booking, "booking must not be null"));

        return toResponse(booking);
    }

    @Transactional
    public BookingResponse cancelBooking(User user, Long bookingId) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        Long id = Objects.requireNonNull(bookingId, "bookingId must not be null");
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getUser().getId().equals(safeUser.getId())) {
            throw new IllegalStateException("You cannot cancel another user's booking");
        }

        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw new IllegalStateException("Only active bookings can be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(Objects.requireNonNull(booking, "booking must not be null"));

        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(
                        Objects.requireNonNull(booking.getSlot().getId(), "slotId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Slot not found"));
        slot.setStatus(SlotStatus.AVAILABLE);
        parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null"));
        synchronizeLot(slot);

        return toResponse(booking);
    }

    public List<BookingResponse> getUserBookings(Long userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(Objects.requireNonNull(userId, "userId must not be null"))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public BookingResponse getUserBookingById(User user, Long bookingId) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        Booking booking = bookingRepository.findById(Objects.requireNonNull(bookingId, "bookingId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (booking.getUser() == null || !booking.getUser().getId().equals(safeUser.getId())) {
            throw new IllegalStateException("You cannot view another user's booking");
        }
        return toResponse(booking);
    }

    public List<AdminBookingResponse> getAllAdminBookings() {
        return bookingRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toAdminResponse)
                .collect(Collectors.toList());
    }

    public AdminBookingResponse getAdminBookingById(Long bookingId) {
        Booking booking = bookingRepository.findById(Objects.requireNonNull(bookingId, "bookingId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        return toAdminResponse(booking);
    }

    @Transactional
    public AdminBookingResponse cancelBookingAsAdmin(Long bookingId) {
        Long id = Objects.requireNonNull(bookingId, "bookingId must not be null");
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalStateException("Completed or cancelled bookings cannot be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
          booking.setPaymentStatus(PaymentStatus.REFUNDED);
        }
        bookingRepository.save(Objects.requireNonNull(booking, "booking must not be null"));

        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(
                        Objects.requireNonNull(booking.getSlot().getId(), "slotId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Slot not found"));

        long activeBookings = bookingRepository.countBySlotIdAndStatusInAndIdNot(
                slot.getId(),
                Arrays.asList(BookingStatus.PENDING, BookingStatus.ACTIVE),
                booking.getId()
        );

        if (activeBookings == 0) {
            slot.setStatus(SlotStatus.AVAILABLE);
            parkingSlotRepository.save(Objects.requireNonNull(slot, "slot must not be null"));
            synchronizeLot(slot);
        }

        return toAdminResponse(booking);
    }

    @Transactional
    public AdminBookingResponse transitionAsAdmin(Long bookingId, String action) {
        Booking booking = bookingRepository.findById(Objects.requireNonNull(bookingId, "bookingId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(booking.getSlot().getId())
                .orElseThrow(() -> new IllegalArgumentException("Slot not found"));
        switch (action) {
            case "APPROVE" -> {
                if (booking.getStatus() != BookingStatus.PENDING) throw new IllegalStateException("Only pending bookings can be approved");
                booking.setStatus(BookingStatus.APPROVED); booking.setApprovedAt(LocalDateTime.now()); slot.setStatus(SlotStatus.RESERVED);
            }
            case "CHECK_IN" -> {
                if (!Arrays.asList(BookingStatus.APPROVED, BookingStatus.RESERVED, BookingStatus.ACTIVE).contains(booking.getStatus())) throw new IllegalStateException("Booking is not ready for check-in");
                if (slot.getStatus() == SlotStatus.MAINTENANCE || slot.getStatus() == SlotStatus.DISABLED) throw new IllegalStateException("This slot cannot be occupied");
                booking.setStatus(BookingStatus.OCCUPIED); booking.setCheckedInAt(LocalDateTime.now()); slot.setStatus(SlotStatus.OCCUPIED);
            }
            case "CHECK_OUT", "COMPLETE" -> {
                if (!Arrays.asList(BookingStatus.OCCUPIED, BookingStatus.ACTIVE, BookingStatus.APPROVED, BookingStatus.RESERVED).contains(booking.getStatus())) throw new IllegalStateException("Booking cannot be completed from its current status");
                booking.setStatus(BookingStatus.COMPLETED); booking.setCheckedOutAt(LocalDateTime.now()); slot.setStatus(SlotStatus.AVAILABLE);
            }
            default -> throw new IllegalArgumentException("Unsupported booking action");
        }
        parkingSlotRepository.save(slot);
        synchronizeLot(slot);
        return toAdminResponse(bookingRepository.save(booking));
    }

    private void synchronizeLot(ParkingSlot slot) {
        ParkingLot lot = slot.getParkingLot();
        int total = (int) parkingSlotRepository.countByParkingLotIdAndArchivedFalse(lot.getId());
        lot.setTotalSlots(total);
        lot.setTotalFloors(ParkingFloor.floorCount(total));
        lot.setAvailableSlots(count(lot, SlotStatus.AVAILABLE));
        lot.setBookedSlots(count(lot, SlotStatus.BOOKED));
        lot.setReservedSlots(count(lot, SlotStatus.RESERVED));
        lot.setOccupiedSlots(count(lot, SlotStatus.OCCUPIED));
        lot.setMaintenanceSlots(count(lot, SlotStatus.MAINTENANCE));
        lot.setDisabledSlots(count(lot, SlotStatus.DISABLED));
        parkingLotRepository.save(lot);
    }

    private int count(ParkingLot lot, SlotStatus status) {
        return (int) parkingSlotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lot.getId(), status);
    }

    private BookingResponse toResponse(Booking booking) {
        Objects.requireNonNull(booking, "booking must not be null");
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
                booking.getAmount()
        );
    }

    private AdminBookingResponse toAdminResponse(Booking booking) {
        Objects.requireNonNull(booking, "booking must not be null");
        return new AdminBookingResponse(
                booking.getId(),
                booking.getUser().getName(),
                booking.getUser().getEmail(),
                booking.getSlot().getParkingLot().getName(),
                booking.getSlot().getSlotNumber(),
                booking.getSlot().getFloor(),
                booking.getVehicleNumber() == null || booking.getVehicleNumber().isBlank() ? "N/A" : booking.getVehicleNumber(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getStatus().name(),
                booking.getPaymentStatus() == null ? PaymentStatus.UNPAID.name() : booking.getPaymentStatus().name(),
                booking.getAmount()
        );
    }
}
