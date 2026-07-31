package com.parking.service;

import com.parking.dto.AdminBookingResponse;
import com.parking.dto.BookingRequest;
import com.parking.dto.BookingResponse;
import com.parking.dto.BatchBookingRequest;
import com.parking.dto.BookingExtensionHistoryResponse;
import com.parking.dto.BookingExtensionRequest;
import com.parking.dto.BookingExtensionResponse;
import com.parking.model.*;
import com.parking.repository.BookingRepository;
import com.parking.repository.ParkingSlotRepository;
import com.parking.repository.ParkingLotRepository;
import com.parking.repository.VehicleRepository;
import com.parking.repository.PaymentRepository;
import com.parking.repository.BookingExtensionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final VehicleRepository vehicleRepository;
    private final PaymentRepository paymentRepository;
    private final BookingExtensionRepository bookingExtensionRepository;
    private final RefundService refundService;

    @Value("${parking.booking.early-checkin-minutes:15}")
    private long earlyCheckInMinutes;
    @Value("${parking.booking.extension-reminder-minutes:15}")
    private long extensionReminderMinutes;
    @Value("${parking.booking.extension-grace-minutes:15}")
    private long extensionGraceMinutes;

    private static final List<BookingStatus> OVERLAP_EXCLUDED =
            List.of(BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.EXPIRED);

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
        validateVehicleAvailable(safeUser, safeRequest.getVehicleNumber());

        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(
                        Objects.requireNonNull(safeRequest.getSlotId(), "slotId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Slot not found"));

        if (slot.getParkingLot() == null || !Boolean.TRUE.equals(slot.getParkingLot().getActive())) {
            throw new IllegalStateException("Selected parking lot is not available for booking");
        }

        if (List.of(SlotStatus.MAINTENANCE, SlotStatus.INACTIVE, SlotStatus.DISABLED, SlotStatus.OCCUPIED)
                .contains(slot.getStatus())) {
            throw new IllegalStateException("Slot " + slot.getSlotNumber() + " is not available for booking");
        }
        if (bookingRepository.hasOverlap(slot.getId(), safeRequest.getStartTime(), safeRequest.getEndTime(),
                OVERLAP_EXCLUDED, null)) {
            throw new IllegalStateException("This slot is already reserved for the selected time range");
        }

        long durationMinutes = Math.max(1, Duration.between(safeRequest.getStartTime(), safeRequest.getEndTime()).toMinutes());
        long days = Math.max(1, (long) Math.ceil(durationMinutes / 1440.0));
        double amount = days * slot.getParkingLot().getPricePerDay();

        LocalDateTime now = LocalDateTime.now();
        BookingStatus initialStatus = safeRequest.getStartTime().isAfter(now)
                ? BookingStatus.RESERVED : BookingStatus.ACTIVE;
        if (initialStatus == BookingStatus.ACTIVE) slot.setStatus(SlotStatus.RESERVED);
        else if (slot.getStatus() == SlotStatus.BOOKED) slot.setStatus(SlotStatus.AVAILABLE);
        parkingSlotRepository.save(slot);

        Booking booking = Booking.builder()
                .user(safeUser)
                .slot(slot)
                .startTime(safeRequest.getStartTime())
                .endTime(safeRequest.getEndTime())
                .vehicleNumber(safeRequest.getVehicleNumber())
                .status(initialStatus)
                .amount(amount)
                .paymentStatus(PaymentStatus.UNPAID)
                .build();

        booking = bookingRepository.save(Objects.requireNonNull(booking, "booking must not be null"));
        synchronizeUserRecords(booking, safeRequest.getVehicleType());

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

        if (!List.of(BookingStatus.RESERVED, BookingStatus.ACTIVE).contains(booking.getStatus())) {
            throw new IllegalStateException("Only reserved or active bookings can be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancellationReason("Cancelled by user");
        bookingRepository.save(Objects.requireNonNull(booking, "booking must not be null"));
        refundService.requestForCancelledBooking(booking, "USER");

        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(
                        Objects.requireNonNull(booking.getSlot().getId(), "slotId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Slot not found"));
        releaseSlotIfSafe(slot, booking.getId(), LocalDateTime.now());

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

        if (!List.of(BookingStatus.RESERVED, BookingStatus.ACTIVE).contains(booking.getStatus())) {
            throw new IllegalStateException("Only reserved or active bookings can be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancellationReason("Cancelled by administrator");
        bookingRepository.save(Objects.requireNonNull(booking, "booking must not be null"));
        refundService.requestForCancelledBooking(booking, "ADMIN");

        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(
                        Objects.requireNonNull(booking.getSlot().getId(), "slotId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Slot not found"));

        releaseSlotIfSafe(slot, booking.getId(), LocalDateTime.now());

        return toAdminResponse(booking);
    }

    @Transactional
    public List<BookingResponse> bookBatch(User user, BatchBookingRequest request) {
        if (!request.endTime().isAfter(request.startTime())) throw new IllegalArgumentException("End time must be after start time.");
        if (request.vehicles().stream()
                .map(item -> Objects.requireNonNull(item, "vehicle slot must not be null").slotId())
                .distinct().count() != request.vehicles().size())
            throw new IllegalArgumentException("Each vehicle must have a different parking slot.");
        if (request.vehicles().stream().map(v -> v.vehicleNumber().replaceAll("[^A-Za-z0-9]", "").toUpperCase()).distinct().count() != request.vehicles().size())
            throw new IllegalArgumentException("Each vehicle number must be unique.");
        return request.vehicles().stream().map(item -> {
            BookingRequest single = new BookingRequest();
            single.setSlotId(item.slotId()); single.setStartTime(request.startTime()); single.setEndTime(request.endTime());
            single.setVehicleNumber(item.vehicleNumber()); single.setVehicleType(item.vehicleType());
            return bookSlot(user, single);
        }).toList();
    }

    @Transactional
    public BookingResponse transitionAsUser(User user, Long bookingId, String action) {
        User safeUser = Objects.requireNonNull(user, "user must not be null");
        Booking booking = bookingRepository.findByIdForUpdate(
                        Objects.requireNonNull(bookingId, "bookingId must not be null"))
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (booking.getUser() == null || !booking.getUser().getId().equals(safeUser.getId())) {
            throw new IllegalStateException("You cannot update another user's booking");
        }

        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(booking.getSlot().getId())
                .orElseThrow(() -> new IllegalArgumentException("Parking slot not found"));
        LocalDateTime now = LocalDateTime.now();

        switch (action) {
            case "CHECK_IN" -> {
                validateVehicleAvailable(safeUser, booking.getVehicleNumber());
                if (!List.of(BookingStatus.RESERVED, BookingStatus.ACTIVE).contains(booking.getStatus())) {
                    throw new IllegalStateException("This booking is not ready for check-in");
                }
                if (now.isBefore(booking.getStartTime().minusMinutes(earlyCheckInMinutes))) {
                    throw new IllegalStateException("Check-in is available only " + earlyCheckInMinutes
                            + " minutes before the booking starts");
                }
                if (!now.isBefore(booking.getEndTime())) {
                    throw new IllegalStateException("This booking has ended and cannot be checked in");
                }
                if (List.of(SlotStatus.MAINTENANCE, SlotStatus.INACTIVE, SlotStatus.DISABLED)
                        .contains(slot.getStatus())) {
                    throw new IllegalStateException("This parking slot is currently unavailable");
                }
                booking.setStatus(BookingStatus.OCCUPIED);
                booking.setCheckedInAt(now);
                booking.setOverstay(false);
                slot.setStatus(SlotStatus.OCCUPIED);
            }
            case "CHECK_OUT" -> {
                if (booking.getStatus() != BookingStatus.OCCUPIED || booking.getCheckedInAt() == null) {
                    throw new IllegalStateException("Check-out is available only after check-in");
                }
                booking.setStatus(BookingStatus.COMPLETED);
                booking.setCheckedOutAt(now);
                booking.setCompletedAt(now);
                booking.setOverstay(false);
                slot.setStatus(SlotStatus.AVAILABLE);
            }
            default -> throw new IllegalArgumentException("Unsupported user booking action");
        }

        parkingSlotRepository.save(slot);
        synchronizeLot(slot);
        return toResponse(bookingRepository.save(booking));
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
                LocalDateTime now = LocalDateTime.now();
                validateVehicleAvailable(booking.getUser(), booking.getVehicleNumber());
                if (!List.of(BookingStatus.RESERVED, BookingStatus.ACTIVE).contains(booking.getStatus())) throw new IllegalStateException("Booking is not ready for check-in");
                if (now.isBefore(booking.getStartTime().minusMinutes(earlyCheckInMinutes))) throw new IllegalStateException("Check-in is available only " + earlyCheckInMinutes + " minutes before the booking starts");
                if (!now.isBefore(booking.getEndTime())) throw new IllegalStateException("This booking has expired and cannot be checked in");
                if (List.of(SlotStatus.MAINTENANCE, SlotStatus.INACTIVE, SlotStatus.DISABLED).contains(slot.getStatus())) throw new IllegalStateException("This slot cannot be occupied");
                booking.setStatus(BookingStatus.OCCUPIED); booking.setCheckedInAt(LocalDateTime.now()); slot.setStatus(SlotStatus.OCCUPIED);
            }
            case "CHECK_OUT", "COMPLETE" -> {
                if (booking.getStatus() != BookingStatus.OCCUPIED || booking.getCheckedInAt() == null) throw new IllegalStateException("Check-out cannot occur before check-in");
                booking.setStatus(BookingStatus.COMPLETED); booking.setCheckedOutAt(LocalDateTime.now());
                booking.setCompletedAt(LocalDateTime.now()); booking.setOverstay(false);
                slot.setStatus(SlotStatus.AVAILABLE);
            }
            default -> throw new IllegalArgumentException("Unsupported booking action");
        }
        parkingSlotRepository.save(slot);
        synchronizeLot(slot);
        return toAdminResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingExtensionResponse extendBooking(User user, Long bookingId, BookingExtensionRequest request, ExtendedBy extendedBy) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (extendedBy == ExtendedBy.USER && !booking.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("You cannot extend another user's booking");
        }
        if (!List.of(BookingStatus.ACTIVE, BookingStatus.OCCUPIED).contains(booking.getStatus())) {
            throw new IllegalStateException("Only active or occupied bookings can be extended");
        }
        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(booking.getEndTime().plusMinutes(extensionGraceMinutes))) {
            throw new IllegalStateException("The permitted extension grace period has ended");
        }
        LocalDateTime newEndTime = request.newEndTime();
        if (!newEndTime.isAfter(booking.getEndTime())) throw new IllegalArgumentException("New end time must be after the current end time");
        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(booking.getSlot().getId())
                .orElseThrow(() -> new IllegalArgumentException("Slot not found"));
        if (List.of(SlotStatus.MAINTENANCE, SlotStatus.INACTIVE, SlotStatus.DISABLED).contains(slot.getStatus())) {
            throw new IllegalStateException("A maintenance or inactive slot cannot be extended");
        }
        ParkingLot lot = slot.getParkingLot();
        if (lot.getClosingTime() != null && newEndTime.toLocalTime().isAfter(lot.getClosingTime())) {
            throw new IllegalStateException("The parking location will be closed before the requested extension ends");
        }
        if (bookingRepository.hasOverlap(slot.getId(), booking.getEndTime(), newEndTime, OVERLAP_EXCLUDED, booking.getId())) {
            throw new IllegalStateException("This slot is already reserved after your current booking. Extension is not available.");
        }
        long extraMinutes = Duration.between(booking.getEndTime(), newEndTime).toMinutes();
        double extraAmount = Math.max(1, Math.ceil(extraMinutes / 1440.0)) * lot.getPricePerDay();
        if (extraAmount > 0 && (request.paymentReference() == null || request.paymentReference().isBlank())) {
            throw new IllegalStateException("Additional payment is required before confirming this extension");
        }
        LocalDateTime previousEnd = booking.getEndTime();
        if (booking.getOriginalEndTime() == null) booking.setOriginalEndTime(previousEnd);
        booking.setEndTime(newEndTime);
        booking.setAmount(booking.getAmount() + extraAmount);
        booking.setExtended(true);
        booking.setExtensionCount((booking.getExtensionCount() == null ? 0 : booking.getExtensionCount()) + 1);
        booking.setOverstay(false);
        bookingRepository.save(booking);
        bookingExtensionRepository.save(BookingExtension.builder()
                .booking(booking).previousEndTime(previousEnd).newEndTime(newEndTime)
                .extraMinutes((int) extraMinutes).extraAmount(extraAmount)
                .paymentReference(request.paymentReference()).extendedBy(extendedBy).build());
        return new BookingExtensionResponse(toResponse(booking), previousEnd, newEndTime, (int) extraMinutes,
                extraAmount, extraAmount > 0, booking.getStatus().name());
    }

    @Transactional(readOnly = true)
    public List<BookingExtensionHistoryResponse> getExtensionHistory(User user, Long bookingId, boolean admin) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (!admin && !booking.getUser().getId().equals(user.getId())) throw new IllegalStateException("Access denied");
        return bookingExtensionRepository.findByBookingIdOrderByCreatedAtDesc(bookingId).stream()
                .map(item -> new BookingExtensionHistoryResponse(item.getId(), item.getPreviousEndTime(),
                        item.getNewEndTime(), item.getExtraMinutes(), item.getExtraAmount(),
                        item.getPaymentReference(), item.getExtendedBy().name(), item.getCreatedAt()))
                .toList();
    }

    private void releaseSlotIfSafe(ParkingSlot slot, Long excludedBookingId, LocalDateTime now) {
        if (slot.getStatus() == SlotStatus.OCCUPIED) return;
        long current = bookingRepository.countCurrentOverlaps(slot.getId(),
                List.of(BookingStatus.RESERVED, BookingStatus.ACTIVE, BookingStatus.OCCUPIED),
                now, excludedBookingId);
        if (current == 0 && !List.of(SlotStatus.MAINTENANCE, SlotStatus.INACTIVE, SlotStatus.DISABLED).contains(slot.getStatus())) {
            slot.setStatus(SlotStatus.AVAILABLE);
            parkingSlotRepository.save(slot);
            synchronizeLot(slot);
        }
    }

    private void synchronizeLot(ParkingSlot slot) {
        ParkingLot lot = slot.getParkingLot();
        int total = (int) parkingSlotRepository.countByParkingLotIdAndArchivedFalse(lot.getId());
        lot.setTotalSlots(total);
        lot.setTotalFloors(ParkingFloor.floorCount(total));
        lot.setAvailableSlots(count(lot, SlotStatus.AVAILABLE));
        lot.setBookedSlots(count(lot, SlotStatus.BOOKED));
        lot.setReservedSlots(count(lot, SlotStatus.RESERVED));
        lot.setMaintenanceSlots(count(lot, SlotStatus.MAINTENANCE));
        lot.setDisabledSlots(count(lot, SlotStatus.INACTIVE) + count(lot, SlotStatus.DISABLED));
        parkingLotRepository.save(lot);
    }

    private void validateVehicleAvailable(User user, String vehicleNumber) {
        if (vehicleNumber == null || vehicleNumber.isBlank()) {
            return;
        }
        String normalized = vehicleNumber.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        vehicleRepository.findByRegistrationNormalized(normalized).ifPresent(vehicle -> {
            if (!vehicle.getOwner().getId().equals(user.getId())) {
                throw new IllegalStateException("This vehicle belongs to another user");
            }
            if (vehicle.isArchived() || !vehicle.isActive()) {
                throw new IllegalStateException("This vehicle is inactive and cannot be used for booking or check-in");
            }
        });
    }

    private int count(ParkingLot lot, SlotStatus status) {
        return (int) parkingSlotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lot.getId(), status);
    }

    private void synchronizeUserRecords(Booking booking, String vehicleType) {
        String registration = booking.getVehicleNumber().trim().toUpperCase(Locale.ROOT);
        String normalized = registration.replaceAll("[^A-Z0-9]", "");
        if (vehicleRepository.findByRegistrationNormalized(normalized).isEmpty()) {
            vehicleRepository.save(Vehicle.builder().owner(booking.getUser()).registrationNumber(registration)
                .registrationNormalized(normalized).vehicleType(vehicleType.trim().toUpperCase(Locale.ROOT))
                .active(true).archived(false).build());
        }
        if (paymentRepository.findFirstByBookingIdOrderByCreatedAtDesc(booking.getId()).isEmpty()) {
            paymentRepository.save(Payment.builder().booking(booking)
                .amount(BigDecimal.valueOf(booking.getAmount())).currency("INR").paymentMethod("ONLINE")
                .transactionReference("BOOKING-" + booking.getId()).status(PaymentStatus.PENDING)
                .paymentDate(null).build());
        }
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
                booking.getAmount(),
                booking.getCheckedInAt(),
                booking.getCheckedOutAt(),
                Boolean.TRUE.equals(booking.getOverstay()),
                Boolean.TRUE.equals(booking.getExtended()),
                booking.getExtensionCount() == null ? 0 : booking.getExtensionCount(),
                booking.getOriginalEndTime(),
                lifecycleMessage(booking)
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
                booking.getAmount(),
                booking.getCheckedInAt(),
                booking.getCheckedOutAt(),
                Boolean.TRUE.equals(booking.getOverstay()),
                Boolean.TRUE.equals(booking.getExtended()),
                booking.getExtensionCount() == null ? 0 : booking.getExtensionCount(),
                lifecycleMessage(booking)
        );
    }

    private String lifecycleMessage(Booking booking) {
        if (Boolean.TRUE.equals(booking.getOverstay())) return "Your parking time has ended. Please extend or check out.";
        LocalDateTime now = LocalDateTime.now();
        if (List.of(BookingStatus.ACTIVE, BookingStatus.OCCUPIED).contains(booking.getStatus())
                && !now.isAfter(booking.getEndTime())
                && !now.isBefore(booking.getEndTime().minusMinutes(extensionReminderMinutes))) {
            return "Your booking ends in " + extensionReminderMinutes + " minutes. Extend now if required.";
        }
        return switch (booking.getStatus()) {
            case RESERVED -> "Your slot is reserved for " + booking.getStartTime() + ".";
            case ACTIVE -> "Your booking is active. Please check in.";
            case COMPLETED -> "Your parking session is completed.";
            case EXPIRED -> "This booking expired because check-in was not completed.";
            default -> "";
        };
    }
}
