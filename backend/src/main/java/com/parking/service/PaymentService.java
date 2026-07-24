package com.parking.service;

import com.parking.dto.PaymentResponse;
import com.parking.model.*;
import com.parking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository payments;
    private final BookingRepository bookings;

    @Transactional
    public PaymentResponse pay(User user, Long bookingId) {
        Booking booking = bookings.findById(bookingId)
            .orElseThrow(() -> new IllegalArgumentException("Booking not found."));
        if (!booking.getUser().getId().equals(user.getId())) {
            throw new IllegalStateException("You cannot pay for another user's booking.");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("A cancelled booking cannot be paid.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (booking.getStartTime().toLocalDate().isAfter(LocalDate.now())) {
            throw new IllegalStateException(
                "Payment will be available on the parking date before the parking start time."
            );
        }
        if (!now.isBefore(booking.getStartTime())) {
            throw new IllegalStateException("Payment is closed because the parking start time has passed.");
        }
        Payment payment = payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId)
            .orElseThrow(() -> new IllegalArgumentException("Payment record not found."));
        if (payment.getStatus() == PaymentStatus.PAID) return response(payment);
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(now);
        booking.setPaymentStatus(PaymentStatus.PAID);
        bookings.save(booking);
        return response(payments.save(payment));
    }

    @Transactional(readOnly = true)
    public PaymentResponse get(User user, Long bookingId) {
        Booking booking = bookings.findById(bookingId)
            .orElseThrow(() -> new IllegalArgumentException("Booking not found."));
        if (!booking.getUser().getId().equals(user.getId())) throw new IllegalStateException("Access denied.");
        return response(payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId)
            .orElseThrow(() -> new IllegalArgumentException("Payment record not found.")));
    }

    private PaymentResponse response(Payment p) {
        return new PaymentResponse(p.getId(), p.getBooking().getId(), p.getAmount(), p.getCurrency(),
            p.getPaymentMethod(), p.getStatus().name(), p.getTransactionReference(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
