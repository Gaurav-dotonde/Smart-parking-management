package com.parking.config;

import com.parking.model.*;
import com.parking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.Locale;

@Component @RequiredArgsConstructor
public class BookingRecordSync implements ApplicationRunner {
    private final BookingRepository bookings;
    private final VehicleRepository vehicles;
    private final PaymentRepository payments;

    @Override @Transactional
    public void run(ApplicationArguments args) {
        for (Booking booking : bookings.findAllByOrderByCreatedAtDesc()) {
            String number = booking.getVehicleNumber();
            if (number != null && !number.isBlank()) {
                String registration = number.trim().toUpperCase(Locale.ROOT);
                String normalized = registration.replaceAll("[^A-Z0-9]", "");
                if (vehicles.findByRegistrationNormalized(normalized).isEmpty()) {
                    vehicles.save(Vehicle.builder().owner(booking.getUser()).registrationNumber(registration)
                        .registrationNormalized(normalized).vehicleType(booking.getSlot().getVehicleType())
                        .active(true).archived(false).build());
                }
            }
            if (payments.findFirstByBookingIdOrderByCreatedAtDesc(booking.getId()).isEmpty()) {
                PaymentStatus status = booking.getPaymentStatus() == null ? PaymentStatus.UNPAID : booking.getPaymentStatus();
                payments.save(Payment.builder().booking(booking).amount(BigDecimal.valueOf(booking.getAmount()))
                    .currency("INR").paymentMethod("ONLINE").transactionReference("BOOKING-" + booking.getId())
                    .status(status).paymentDate(status == PaymentStatus.PAID ? booking.getCreatedAt() : null).build());
            }
        }
    }
}
