package com.parking.repository;

import com.parking.model.Booking;
import com.parking.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Booking> findAllByOrderByCreatedAtDesc();
    long countBySlotIdAndStatusInAndIdNot(Long slotId, List<BookingStatus> statuses, Long id);
    long countBySlotId(Long slotId);
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
    Optional<Booking> findFirstBySlotIdAndStatusInOrderByStartTimeAsc(Long slotId, List<BookingStatus> statuses);

    List<Booking> findByStatusIn(List<BookingStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    @Query("""
        select (count(b) > 0) from Booking b
        where b.slot.id = :slotId
          and b.status not in :excludedStatuses
          and b.startTime < :requestedEnd
          and b.endTime > :requestedStart
          and (:excludedBookingId is null or b.id <> :excludedBookingId)
        """)
    boolean hasOverlap(
            @Param("slotId") Long slotId,
            @Param("requestedStart") LocalDateTime requestedStart,
            @Param("requestedEnd") LocalDateTime requestedEnd,
            @Param("excludedStatuses") List<BookingStatus> excludedStatuses,
            @Param("excludedBookingId") Long excludedBookingId
    );

    @Query("""
        select count(b) from Booking b
        where b.slot.id = :slotId
          and b.status in :statuses
          and b.startTime <= :now and b.endTime > :now
          and (:excludedBookingId is null or b.id <> :excludedBookingId)
        """)
    long countCurrentOverlaps(
            @Param("slotId") Long slotId,
            @Param("statuses") List<BookingStatus> statuses,
            @Param("now") LocalDateTime now,
            @Param("excludedBookingId") Long excludedBookingId
    );

    long countByStatus(BookingStatus status);
    long countByStatusIn(List<BookingStatus> statuses);
    long countByStartTimeBetween(LocalDateTime start, LocalDateTime end);

    @Query("""
        select distinct b.slot.id from Booking b
        where b.slot.parkingLot.id = :lotId
          and b.status not in :excludedStatuses
          and b.startTime < :requestedEnd
          and b.endTime > :requestedStart
        """)
    List<Long> findReservedSlotIds(
            @Param("lotId") Long lotId,
            @Param("requestedStart") LocalDateTime requestedStart,
            @Param("requestedEnd") LocalDateTime requestedEnd,
            @Param("excludedStatuses") List<BookingStatus> excludedStatuses
    );
}
