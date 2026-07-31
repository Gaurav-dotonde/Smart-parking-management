package com.parking.repository;

import com.parking.model.Refund;
import com.parking.model.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RefundRepository extends JpaRepository<Refund, Long>, JpaSpecificationExecutor<Refund> {
    Page<Refund> findByUserId(Long userId, Pageable pageable);
    Page<Refund> findByUserIdAndRefundStatus(Long userId, RefundStatus status, Pageable pageable);
    Optional<Refund> findByPublicRefundId(String publicRefundId);
    Optional<Refund> findByPublicRefundIdAndUserId(String publicRefundId, Long userId);
    Optional<Refund> findFirstByBookingIdAndRefundStatusInOrderByCreatedAtDesc(Long bookingId, Collection<RefundStatus> statuses);
    List<Refund> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Refund> findByBookingIdOrderByAttemptNumberAsc(Long bookingId);
    List<Refund> findByPaymentIdOrderByAttemptNumberAsc(Long paymentId);
    long countByPaymentId(Long paymentId);

    @Query("select coalesce(sum(r.approvedRefundAmount), 0) from Refund r where r.payment.id=:paymentId and r.refundStatus in :statuses")
    BigDecimal sumAmountByPaymentAndStatuses(@Param("paymentId") Long paymentId, @Param("statuses") Collection<RefundStatus> statuses);

    @Query("select coalesce(sum(r.approvedRefundAmount), 0) from Refund r where r.user.id=:userId and r.refundStatus=:status")
    BigDecimal sumUserAmountByStatus(@Param("userId") Long userId, @Param("status") RefundStatus status);

    long countByUserIdAndRefundStatus(Long userId, RefundStatus status);
    long countByRefundStatus(RefundStatus status);

    @Query("select coalesce(sum(r.approvedRefundAmount), 0) from Refund r where r.refundStatus='COMPLETED'")
    BigDecimal sumCompletedAmount();

    @Query("select coalesce(sum(r.approvedRefundAmount), 0) from Refund r where r.refundStatus='COMPLETED' and r.completedAt between :from and :to")
    BigDecimal sumCompletedBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
