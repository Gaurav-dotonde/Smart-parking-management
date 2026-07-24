package com.parking.service;

import com.parking.model.*;
import com.parking.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingLifecycleServiceTest {
    @Mock BookingRepository bookings;
    @Mock ParkingSlotRepository slots;
    @Mock ParkingLotRepository lots;
    @InjectMocks BookingLifecycleService service;

    ParkingLot lot;
    ParkingSlot slot;
    LocalDateTime now;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(service, "noShowGraceMinutes", 15L);
        now = LocalDateTime.of(2026, 7, 24, 12, 0);
        lot = ParkingLot.builder().id(1L).name("Test Lot").location("Test").totalSlots(1)
                .pricePerDay(100d).active(true).archived(false).build();
        slot = ParkingSlot.builder().id(1L).parkingLot(lot).slotNumber("A1").floor(0)
                .status(SlotStatus.AVAILABLE).archived(false).build();
    }

    private Booking booking(BookingStatus status, LocalDateTime start, LocalDateTime end) {
        return Booking.builder().id(1L).slot(slot).status(status).startTime(start).endTime(end)
                .amount(100d).build();
    }

    @Test
    void futureBookingRemainsReservedAndSlotAvailableNow() {
        Booking booking = booking(BookingStatus.RESERVED, now.plusHours(1), now.plusHours(2));
        when(bookings.findByStatusIn(anyList())).thenReturn(List.of(booking));
        service.processAt(now);
        assertEquals(BookingStatus.RESERVED, booking.getStatus());
        assertEquals(SlotStatus.AVAILABLE, slot.getStatus());
    }

    @Test
    void bookingBecomesActiveWhenStartArrives() {
        Booking booking = booking(BookingStatus.RESERVED, now, now.plusHours(2));
        when(bookings.findByStatusIn(anyList())).thenReturn(List.of(booking));
        service.processAt(now);
        assertEquals(BookingStatus.ACTIVE, booking.getStatus());
        assertEquals(SlotStatus.RESERVED, slot.getStatus());
    }

    @Test
    void noShowExpiresAndReleasesSlotAfterGracePeriod() {
        slot.setStatus(SlotStatus.RESERVED);
        Booking booking = booking(BookingStatus.ACTIVE, now.minusMinutes(16), now.plusHours(1));
        when(bookings.findByStatusIn(anyList())).thenReturn(List.of(booking));
        when(bookings.countCurrentOverlaps(anyLong(), anyList(), any(), anyLong())).thenReturn(0L);
        service.processAt(now);
        assertEquals(BookingStatus.EXPIRED, booking.getStatus());
        assertNotNull(booking.getExpiredAt());
        assertEquals(SlotStatus.AVAILABLE, slot.getStatus());
    }

    @Test
    void occupiedBookingBecomesOverstayWithoutReleasingSlot() {
        slot.setStatus(SlotStatus.OCCUPIED);
        Booking booking = booking(BookingStatus.OCCUPIED, now.minusHours(2), now.minusMinutes(1));
        booking.setCheckedInAt(now.minusHours(2));
        when(bookings.findByStatusIn(anyList())).thenReturn(List.of(booking));
        service.processAt(now);
        assertTrue(booking.getOverstay());
        assertEquals(BookingStatus.OCCUPIED, booking.getStatus());
        assertEquals(SlotStatus.OCCUPIED, slot.getStatus());
    }
}
