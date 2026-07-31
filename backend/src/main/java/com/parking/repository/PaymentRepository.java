package com.parking.repository;
import com.parking.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
public interface PaymentRepository extends JpaRepository<Payment,Long>{
 List<Payment> findAllByOrderByCreatedAtDesc();
 boolean existsByTransactionReference(String reference);
 Optional<Payment> findFirstByBookingIdOrderByCreatedAtDesc(Long bookingId);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select p from Payment p where p.id=(select max(p2.id) from Payment p2 where p2.booking.id=:bookingId)")
 Optional<Payment> findLatestByBookingIdForUpdate(@org.springframework.data.repository.query.Param("bookingId") Long bookingId);
 @Query("""
   select coalesce(sum(p.amount - coalesce(p.refundAmount, 0)), 0)
   from Payment p where p.status in (com.parking.model.PaymentStatus.PAID, com.parking.model.PaymentStatus.PARTIALLY_REFUNDED)
   """)
 BigDecimal calculateNetRevenue();
}
