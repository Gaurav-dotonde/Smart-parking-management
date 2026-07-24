package com.parking.repository;

import com.parking.model.BookingExtension;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingExtensionRepository extends JpaRepository<BookingExtension, Long> {
    List<BookingExtension> findByBookingIdOrderByCreatedAtDesc(Long bookingId);
}
