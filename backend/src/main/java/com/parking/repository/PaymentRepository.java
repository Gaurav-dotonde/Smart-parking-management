package com.parking.repository;
import com.parking.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.Query;
public interface PaymentRepository extends JpaRepository<Payment,Long>{
 List<Payment> findAllByOrderByCreatedAtDesc();
 boolean existsByTransactionReference(String reference);
 Optional<Payment> findFirstByBookingIdOrderByCreatedAtDesc(Long bookingId);
 @Query("""
   select coalesce(sum(p.amount - coalesce(p.refundAmount, 0)), 0)
   from Payment p where p.status in (com.parking.model.PaymentStatus.PAID, com.parking.model.PaymentStatus.PARTIALLY_REFUNDED)
   """)
 BigDecimal calculateNetRevenue();
}
