package com.parking.service;

import com.parking.dto.BookingExtensionRequest;
import com.parking.dto.BookingRequest;
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
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceLifecycleTest {
    @Mock BookingRepository bookings;
    @Mock ParkingSlotRepository slots;
    @Mock ParkingLotRepository lots;
    @Mock VehicleRepository vehicles;
    @Mock PaymentRepository payments;
    @Mock BookingExtensionRepository extensions;
    @Mock RefundService refundService;
    @InjectMocks BookingService service;

    User user;
    ParkingSlot slot;
    Booking booking;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(service, "earlyCheckInMinutes", 15L);
        user = User.builder().id(7L).name("User").email("user@test.com").build();
        ParkingLot lot = ParkingLot.builder().id(2L).name("Lot").location("City").totalSlots(1)
                .pricePerDay(100d).active(true).archived(false).closingTime(LocalTime.of(23, 59)).build();
        slot = ParkingSlot.builder().id(3L).parkingLot(lot).slotNumber("A1").floor(0)
                .vehicleType("CAR").status(SlotStatus.RESERVED).archived(false).build();
        booking = Booking.builder().id(4L).user(user).slot(slot).startTime(LocalDateTime.now().minusMinutes(5))
                .endTime(LocalDateTime.now().plusHours(2)).status(BookingStatus.ACTIVE)
                .paymentStatus(PaymentStatus.PAID).amount(100d).build();
        lenient().when(bookings.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(slots.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void checkInMakesBookingAndSlotOccupied() {
        when(bookings.findById(4L)).thenReturn(Optional.of(booking));
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        service.transitionAsAdmin(4L, "CHECK_IN");
        assertEquals(BookingStatus.OCCUPIED, booking.getStatus());
        assertEquals(SlotStatus.OCCUPIED, slot.getStatus());
        assertNotNull(booking.getCheckedInAt());
    }

    @Test
    void checkOutCompletesAndReleasesOccupiedSlot() {
        booking.setStatus(BookingStatus.OCCUPIED);
        booking.setCheckedInAt(LocalDateTime.now().minusHours(1));
        slot.setStatus(SlotStatus.OCCUPIED);
        when(bookings.findById(4L)).thenReturn(Optional.of(booking));
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        service.transitionAsAdmin(4L, "CHECK_OUT");
        assertEquals(BookingStatus.COMPLETED, booking.getStatus());
        assertEquals(SlotStatus.AVAILABLE, slot.getStatus());
        assertNotNull(booking.getCheckedOutAt());
    }

    @Test
    void checkOutBeforeCheckInIsRejected() {
        when(bookings.findById(4L)).thenReturn(Optional.of(booking));
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        assertThrows(IllegalStateException.class, () -> service.transitionAsAdmin(4L, "CHECK_OUT"));
    }

    @Test
    void userCanCheckInOwnBooking() {
        when(bookings.findByIdForUpdate(4L)).thenReturn(Optional.of(booking));
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        var response = service.transitionAsUser(user, 4L, "CHECK_IN");
        assertEquals("OCCUPIED", response.getStatus());
        assertEquals(BookingStatus.OCCUPIED, booking.getStatus());
        assertEquals(SlotStatus.OCCUPIED, slot.getStatus());
    }

    @Test
    void userCannotCheckInAnotherUsersBooking() {
        User anotherUser = User.builder().id(99L).name("Another User").email("another@test.com").build();
        when(bookings.findByIdForUpdate(4L)).thenReturn(Optional.of(booking));
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> service.transitionAsUser(anotherUser, 4L, "CHECK_IN"));
        assertTrue(error.getMessage().contains("another user's booking"));
        verify(slots, never()).findByIdForUpdate(anyLong());
        verify(bookings, never()).save(any());
    }

    @Test
    void extensionSucceedsAndUpdatesAmountAndHistory() {
        when(bookings.findByIdForUpdate(4L)).thenReturn(Optional.of(booking));
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        when(bookings.hasOverlap(anyLong(), any(), any(), anyList(), anyLong())).thenReturn(false);
        LocalDateTime newEnd = booking.getEndTime().plusHours(1);
        var response = service.extendBooking(user, 4L,
                new BookingExtensionRequest(newEnd, 60, "PAY-EXT-1"), ExtendedBy.USER);
        assertEquals(newEnd, booking.getEndTime());
        assertEquals(200d, booking.getAmount());
        assertEquals(1, booking.getExtensionCount());
        assertTrue(booking.getExtended());
        verify(extensions).save(any(BookingExtension.class));
        assertEquals(100d, response.additionalAmount());
    }

    @Test
    void extensionFailsWhenNextBookingOverlaps() {
        when(bookings.findByIdForUpdate(4L)).thenReturn(Optional.of(booking));
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        when(bookings.hasOverlap(anyLong(), any(), any(), anyList(), anyLong())).thenReturn(true);
        LocalDateTime newEnd = booking.getEndTime().plusHours(1);
        IllegalStateException error = assertThrows(IllegalStateException.class, () ->
                service.extendBooking(user, 4L, new BookingExtensionRequest(newEnd, 60, "PAY"), ExtendedBy.USER));
        assertTrue(error.getMessage().contains("already reserved"));
    }

    @Test
    void completedBookingCannotBeExtended() {
        booking.setStatus(BookingStatus.COMPLETED);
        when(bookings.findByIdForUpdate(4L)).thenReturn(Optional.of(booking));
        assertThrows(IllegalStateException.class, () ->
                service.extendBooking(user, 4L,
                        new BookingExtensionRequest(LocalDateTime.now().plusHours(3), 60, "PAY"), ExtendedBy.USER));
    }

    @Test
    void userCannotExtendAnotherUsersBooking() {
        when(bookings.findByIdForUpdate(4L)).thenReturn(Optional.of(booking));
        User other = User.builder().id(99L).build();
        assertThrows(IllegalStateException.class, () ->
                service.extendBooking(other, 4L,
                        new BookingExtensionRequest(booking.getEndTime().plusHours(1), 60, "PAY"), ExtendedBy.USER));
    }

    @Test
    void maintenanceSlotCannotBeExtended() {
        slot.setStatus(SlotStatus.MAINTENANCE);
        when(bookings.findByIdForUpdate(4L)).thenReturn(Optional.of(booking));
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        assertThrows(IllegalStateException.class, () ->
                service.extendBooking(user, 4L,
                        new BookingExtensionRequest(booking.getEndTime().plusHours(1), 60, "PAY"), ExtendedBy.USER));
    }

    @Test
    void futureBookingIsCreatedAsReserved() {
        slot.setStatus(SlotStatus.AVAILABLE);
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        when(bookings.hasOverlap(anyLong(), any(), any(), anyList(), isNull())).thenReturn(false);
        when(vehicles.findByRegistrationNormalized(anyString())).thenReturn(Optional.empty());
        when(payments.findFirstByBookingIdOrderByCreatedAtDesc(any())).thenReturn(Optional.empty());
        BookingRequest request = new BookingRequest();
        request.setSlotId(3L);
        request.setStartTime(LocalDateTime.now().plusDays(1));
        request.setEndTime(LocalDateTime.now().plusDays(1).plusHours(2));
        request.setVehicleNumber("MH 12 AB 1234");
        request.setVehicleType("CAR");
        var response = service.bookSlot(user, request);
        assertEquals("RESERVED", response.getStatus());
        assertEquals(SlotStatus.AVAILABLE, slot.getStatus());
    }

    @Test
    void overlappingBookingIsRejectedByBackend() {
        slot.setStatus(SlotStatus.AVAILABLE);
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        when(bookings.hasOverlap(anyLong(), any(), any(), anyList(), isNull())).thenReturn(true);
        BookingRequest request = new BookingRequest();
        request.setSlotId(3L);
        request.setStartTime(LocalDateTime.now().plusDays(1));
        request.setEndTime(LocalDateTime.now().plusDays(1).plusHours(2));
        request.setVehicleNumber("MH 12 AB 1234");
        request.setVehicleType("CAR");
        assertThrows(IllegalStateException.class, () -> service.bookSlot(user, request));
    }

    @Test
    void cancelledBookingReleasesSlot() {
        booking.setStatus(BookingStatus.RESERVED);
        when(bookings.findById(4L)).thenReturn(Optional.of(booking));
        when(slots.findByIdForUpdate(3L)).thenReturn(Optional.of(slot));
        when(bookings.countCurrentOverlaps(anyLong(), anyList(), any(), anyLong())).thenReturn(0L);
        service.cancelBooking(user, 4L);
        assertEquals(BookingStatus.CANCELLED, booking.getStatus());
        assertEquals(SlotStatus.AVAILABLE, slot.getStatus());
    }
}
