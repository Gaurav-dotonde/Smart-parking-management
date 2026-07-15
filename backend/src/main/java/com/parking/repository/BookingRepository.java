package com.parking.repository;

import com.parking.model.Booking;
import com.parking.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.LocalDateTime;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Booking> findAllByOrderByCreatedAtDesc();
    long countBySlotIdAndStatusInAndIdNot(Long slotId, List<BookingStatus> statuses, Long id);
    long countByUserId(Long userId);
    long countByUserIdAndStatusIn(Long userId, List<BookingStatus> statuses);
    List<Booking> findTop5ByUserIdOrderByCreatedAtDesc(Long userId);
    List<Booking> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime from, LocalDateTime to);
    boolean existsBySlotIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
            Long slotId,
            List<BookingStatus> statuses,
            LocalDateTime endTime,
            LocalDateTime startTime
    );
}
