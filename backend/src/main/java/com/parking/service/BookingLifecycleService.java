package com.parking.service;

import com.parking.model.*;
import com.parking.repository.BookingRepository;
import com.parking.repository.ParkingLotRepository;
import com.parking.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingLifecycleService {
    private final BookingRepository bookingRepository;
    private final ParkingSlotRepository slotRepository;
    private final ParkingLotRepository lotRepository;

    @Value("${parking.booking.no-show-grace-minutes:15}")
    private long noShowGraceMinutes;

    private static final List<BookingStatus> PROCESSABLE = List.of(
            BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.CONFIRMED,
            BookingStatus.RESERVED, BookingStatus.ACTIVE, BookingStatus.OCCUPIED,
            BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.EXPIRED
    );

    @Scheduled(fixedRate = 60000, initialDelay = 60000)
    @Transactional
    public void processLifecycle() {
        processAt(LocalDateTime.now());
    }

    @Transactional
    public void processAt(LocalDateTime now) {
        for (Booking booking : bookingRepository.findByStatusIn(PROCESSABLE)) {
            processBooking(booking, now);
        }
    }

    private void processBooking(Booking booking, LocalDateTime now) {
        ParkingSlot slot = booking.getSlot();
        BookingStatus status = booking.getStatus();

        if (List.of(BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.EXPIRED).contains(status)) {
            releaseIfSafe(slot, booking.getId(), now);
            slotRepository.save(slot);
            refreshLot(slot.getParkingLot());
            return;
        }

        if (status == BookingStatus.PENDING || status == BookingStatus.APPROVED || status == BookingStatus.CONFIRMED) {
            status = booking.getStartTime().isAfter(now) ? BookingStatus.RESERVED : BookingStatus.ACTIVE;
            booking.setStatus(status);
        }

        if (status == BookingStatus.ACTIVE && booking.getStartTime().isAfter(now)) {
            booking.setStatus(BookingStatus.RESERVED);
            status = BookingStatus.RESERVED;
            if (slot.getStatus() == SlotStatus.BOOKED || slot.getStatus() == SlotStatus.RESERVED) {
                slot.setStatus(SlotStatus.AVAILABLE);
            }
        }

        if (status == BookingStatus.RESERVED && !now.isBefore(booking.getStartTime())) {
            booking.setStatus(BookingStatus.ACTIVE);
            status = BookingStatus.ACTIVE;
            if (isOperational(slot)) slot.setStatus(SlotStatus.RESERVED);
        }

        if (status == BookingStatus.ACTIVE && booking.getCheckedInAt() == null
                && now.isAfter(booking.getStartTime().plusMinutes(noShowGraceMinutes))) {
            booking.setStatus(BookingStatus.EXPIRED);
            booking.setExpiredAt(now);
            releaseIfSafe(slot, booking.getId(), now);
        } else if (status == BookingStatus.OCCUPIED && !now.isBefore(booking.getEndTime())) {
            booking.setOverstay(true);
            slot.setStatus(SlotStatus.OCCUPIED);
        } else if (status == BookingStatus.RESERVED && slot.getStatus() == SlotStatus.BOOKED) {
            slot.setStatus(SlotStatus.AVAILABLE);
        }

        bookingRepository.save(booking);
        slotRepository.save(slot);
        refreshLot(slot.getParkingLot());
    }

    private void releaseIfSafe(ParkingSlot slot, Long excludedBookingId, LocalDateTime now) {
        if (slot.getStatus() == SlotStatus.OCCUPIED) return;
        long otherCurrentBookings = bookingRepository.countCurrentOverlaps(
                slot.getId(),
                List.of(BookingStatus.RESERVED, BookingStatus.ACTIVE, BookingStatus.OCCUPIED),
                now,
                excludedBookingId
        );
        if (otherCurrentBookings == 0 && isOperational(slot)) slot.setStatus(SlotStatus.AVAILABLE);
    }

    private boolean isOperational(ParkingSlot slot) {
        return !Boolean.TRUE.equals(slot.getArchived())
                && !List.of(SlotStatus.MAINTENANCE, SlotStatus.INACTIVE, SlotStatus.DISABLED).contains(slot.getStatus());
    }

    private void refreshLot(ParkingLot lot) {
        lot.setAvailableSlots((int) slotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lot.getId(), SlotStatus.AVAILABLE));
        lot.setReservedSlots((int) slotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lot.getId(), SlotStatus.RESERVED));
        lot.setMaintenanceSlots((int) slotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lot.getId(), SlotStatus.MAINTENANCE));
        lot.setDisabledSlots((int) (
                slotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lot.getId(), SlotStatus.INACTIVE)
                + slotRepository.countByParkingLotIdAndArchivedFalseAndStatus(lot.getId(), SlotStatus.DISABLED)
        ));
        lotRepository.save(lot);
    }
}
