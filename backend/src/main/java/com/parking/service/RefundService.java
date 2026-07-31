package com.parking.service;

import com.parking.dto.*;
import com.parking.model.*;
import com.parking.repository.BookingRepository;
import com.parking.repository.PaymentRepository;
import com.parking.repository.RefundRepository;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RefundService {
    private static final Set<RefundStatus> ACTIVE = EnumSet.of(
            RefundStatus.REQUESTED, RefundStatus.INITIATED, RefundStatus.PROCESSING);
    private static final Set<RefundStatus> RESERVED_AMOUNT = EnumSet.of(
            RefundStatus.REQUESTED, RefundStatus.INITIATED, RefundStatus.PROCESSING, RefundStatus.COMPLETED);

    private final RefundRepository refunds;
    private final PaymentRepository payments;
    private final BookingRepository bookings;

    @Transactional
    public Optional<Refund> requestForCancelledBooking(Booking booking, String requestedBy) {
        Objects.requireNonNull(booking, "booking must not be null");
        if (booking.getStatus() != BookingStatus.CANCELLED) {
            throw new IllegalStateException("Refund can only be requested for a cancelled booking.");
        }

        Payment payment = payments.findLatestByBookingIdForUpdate(booking.getId()).orElse(null);
        if (payment == null || !List.of(PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED).contains(payment.getStatus())) {
            return Optional.empty();
        }

        Optional<Refund> existing = refunds.findFirstByBookingIdAndRefundStatusInOrderByCreatedAtDesc(
                booking.getId(), ACTIVE);
        if (existing.isPresent()) {
            syncPending(payment, booking);
            return existing;
        }

        BigDecimal remaining = remainingRefundable(payment);
        if (remaining.signum() <= 0) return Optional.empty();

        int attempt = Math.toIntExact(refunds.countByPaymentId(payment.getId()) + 1);
        Refund refund = Refund.builder()
                .publicRefundId(nextPublicId())
                .payment(payment)
                .booking(booking)
                .user(booking.getUser())
                .attemptNumber(attempt)
                .originalPaymentAmount(money(payment.getAmount()))
                .requestedAmount(remaining)
                .cancellationFee(BigDecimal.ZERO.setScale(2))
                .approvedRefundAmount(remaining)
                .currency(payment.getCurrency())
                .refundMethod(payment.getPaymentMethod())
                .refundStatus(RefundStatus.REQUESTED)
                .transactionReference(payment.getTransactionReference())
                .requestedAt(LocalDateTime.now())
                .requestedBy(cleanActor(requestedBy))
                .build();
        refund = refunds.save(refund);
        syncPending(payment, booking);
        return Optional.of(refund);
    }

    @Transactional
    public Refund completeManualRefund(Payment payment, BigDecimal amount, String requestedBy) {
        Payment locked = payments.findById(payment.getId())
                .orElseThrow(() -> new IllegalArgumentException("Payment not found."));
        if (!List.of(PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUND_PENDING)
                .contains(locked.getStatus())) {
            throw new IllegalStateException("Only paid or pending-refund payments can be refunded.");
        }
        Booking booking = locked.getBooking();
        if (booking.getStatus() != BookingStatus.CANCELLED) {
            throw new IllegalStateException("Refund can only be completed for a cancelled booking.");
        }

        BigDecimal requested = money(amount);
        if (requested.signum() <= 0) {
            throw new IllegalArgumentException("Invalid refund amount.");
        }

        Refund refund = refunds.findFirstByBookingIdAndRefundStatusInOrderByCreatedAtDesc(booking.getId(), ACTIVE)
                .filter(item -> item.getApprovedRefundAmount().compareTo(requested) == 0)
                .orElse(null);
        if (refund == null) {
            BigDecimal remaining = remainingRefundable(locked);
            if (requested.compareTo(remaining) > 0) {
                throw new IllegalArgumentException("Invalid refund amount.");
            }
            refund = refunds.save(Refund.builder()
                    .publicRefundId(nextPublicId()).payment(locked).booking(booking).user(booking.getUser())
                    .attemptNumber(Math.toIntExact(refunds.countByPaymentId(locked.getId()) + 1))
                    .originalPaymentAmount(money(locked.getAmount())).requestedAmount(requested)
                    .cancellationFee(BigDecimal.ZERO.setScale(2)).approvedRefundAmount(requested)
                    .currency(locked.getCurrency()).refundMethod(locked.getPaymentMethod())
                    .refundStatus(RefundStatus.REQUESTED).transactionReference(locked.getTransactionReference())
                    .requestedAt(LocalDateTime.now()).requestedBy(cleanActor(requestedBy)).build());
        }

        LocalDateTime now = LocalDateTime.now();
        refund.setRefundStatus(RefundStatus.COMPLETED);
        if (refund.getInitiatedAt() == null) refund.setInitiatedAt(now);
        if (refund.getProcessingAt() == null) refund.setProcessingAt(now);
        refund.setCompletedAt(now);
        refund.setFailureReason(null);
        refund = refunds.save(refund);
        applyCompletedTotals(locked, booking, now);
        return refund;
    }

    @Transactional
    public Refund retry(String publicRefundId, String reason) {
        Refund failed = find(publicRefundId);
        if (failed.getRefundStatus() != RefundStatus.FAILED) {
            throw new IllegalStateException("Only failed refunds can be retried.");
        }
        if (refunds.findFirstByBookingIdAndRefundStatusInOrderByCreatedAtDesc(failed.getBooking().getId(), ACTIVE).isPresent()) {
            throw new IllegalStateException("Another refund attempt is already active.");
        }
        BigDecimal remaining = remainingRefundable(failed.getPayment());
        BigDecimal retryAmount = failed.getApprovedRefundAmount().min(remaining);
        if (retryAmount.signum() <= 0) throw new IllegalStateException("No refundable balance remains.");

        Refund retry = Refund.builder()
                .publicRefundId(nextPublicId()).payment(failed.getPayment()).booking(failed.getBooking())
                .user(failed.getUser()).attemptNumber(Math.toIntExact(refunds.countByPaymentId(failed.getPayment().getId()) + 1))
                .originalPaymentAmount(failed.getOriginalPaymentAmount()).requestedAmount(retryAmount)
                .cancellationFee(failed.getCancellationFee()).approvedRefundAmount(retryAmount)
                .currency(failed.getCurrency()).refundMethod(failed.getRefundMethod())
                .refundStatus(RefundStatus.REQUESTED).transactionReference(failed.getTransactionReference())
                .requestedAt(LocalDateTime.now()).requestedBy("ADMIN_RETRY").retryReason(reason.trim()).build();
        retry = refunds.save(retry);
        syncPending(failed.getPayment(), failed.getBooking());
        return retry;
    }

    @Transactional
    public Refund markProcessing(String publicRefundId) {
        Refund refund = find(publicRefundId);
        if (!List.of(RefundStatus.REQUESTED, RefundStatus.INITIATED).contains(refund.getRefundStatus())) {
            throw new IllegalStateException("Refund cannot move to processing from its current status.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (refund.getInitiatedAt() == null) refund.setInitiatedAt(now);
        refund.setProcessingAt(now);
        refund.setRefundStatus(RefundStatus.PROCESSING);
        syncPending(refund.getPayment(), refund.getBooking());
        return refunds.save(refund);
    }

    @Transactional
    public Refund markFailed(String publicRefundId, String safeReason) {
        Refund refund = find(publicRefundId);
        if (!ACTIVE.contains(refund.getRefundStatus())) {
            throw new IllegalStateException("Only an active refund can fail.");
        }
        refund.setRefundStatus(RefundStatus.FAILED);
        refund.setFailedAt(LocalDateTime.now());
        refund.setFailureReason(safeReason == null ? "Refund processing failed." : safeReason.trim());
        Refund saved = refunds.save(refund);
        syncAfterFailure(refund.getPayment(), refund.getBooking());
        return saved;
    }

    @Transactional(readOnly = true)
    public UserRefundSummaryResponse userSummary(Long userId) {
        List<Refund> rows = refunds.findByUserIdOrderByCreatedAtDesc(userId);
        BigDecimal completed = sum(rows, Set.of(RefundStatus.COMPLETED));
        BigDecimal pending = sum(rows, ACTIVE);
        Refund latest = rows.isEmpty() ? null : rows.get(0);
        return new UserRefundSummaryResponse(completed, pending,
                count(rows, RefundStatus.COMPLETED), count(rows, RefundStatus.PROCESSING),
                count(rows, RefundStatus.FAILED), latest == null ? null : latest.getRefundStatus().name(),
                latest == null ? null : latest.getPublicRefundId(),
                latest == null ? null : Optional.ofNullable(latest.getUpdatedAt()).orElse(latest.getCreatedAt()));
    }

    @Transactional(readOnly = true)
    public AdminRefundSummaryResponse adminSummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        return new AdminRefundSummaryResponse(money(refunds.sumCompletedAmount()),
                refunds.countByRefundStatus(RefundStatus.REQUESTED) + refunds.countByRefundStatus(RefundStatus.INITIATED),
                refunds.countByRefundStatus(RefundStatus.PROCESSING),
                refunds.countByRefundStatus(RefundStatus.COMPLETED),
                refunds.countByRefundStatus(RefundStatus.FAILED),
                money(refunds.sumCompletedBetween(dayStart, dayStart.plusDays(1))),
                money(refunds.sumCompletedBetween(monthStart, monthStart.plusMonths(1))));
    }

    @Transactional(readOnly = true)
    public RefundPageResponse listUser(Long userId, RefundStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(validPage(page), validSize(size), refundSort());
        Page<Refund> result = status == null ? refunds.findByUserId(userId, pageable)
                : refunds.findByUserIdAndRefundStatus(userId, status, pageable);
        return page(result);
    }

    @Transactional(readOnly = true)
    public RefundPageResponse listAdmin(RefundStatus status, LocalDateTime from, LocalDateTime to,
                                        String method, Long locationId, String query, int page, int size) {
        Specification<Refund> spec = (root, cq, cb) -> cb.conjunction();
        if (status != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("refundStatus"), status));
        if (from != null) spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.get("requestedAt"), from));
        if (to != null) spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(root.get("requestedAt"), to));
        if (method != null && !method.isBlank()) spec = spec.and((root, cq, cb) ->
                cb.equal(cb.lower(root.get("refundMethod")), method.trim().toLowerCase(Locale.ROOT)));
        if (locationId != null) spec = spec.and((root, cq, cb) ->
                cb.equal(root.join("booking").join("slot").join("parkingLot").get("id"), locationId));
        if (query != null && !query.isBlank()) {
            String like = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, cq, cb) -> {
                var booking = root.join("booking", JoinType.INNER);
                var user = root.join("user", JoinType.INNER);
                return cb.or(cb.like(cb.lower(root.get("publicRefundId")), like),
                        cb.like(cb.lower(user.get("name")), like), cb.like(cb.lower(user.get("email")), like),
                        cb.like(cb.function("str", String.class, booking.get("id")), like));
            });
        }
        Page<Refund> result = refunds.findAll(spec,
                PageRequest.of(validPage(page), validSize(size), refundSort()));
        return page(result);
    }

    @Transactional(readOnly = true)
    public RefundDetailResponse userDetail(Long userId, String publicId) {
        return detail(refunds.findByPublicRefundIdAndUserId(publicId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Refund not found.")));
    }

    @Transactional(readOnly = true)
    public RefundDetailResponse adminDetail(String publicId) {
        return detail(find(publicId));
    }

    private Refund find(String publicId) {
        return refunds.findByPublicRefundId(publicId)
                .orElseThrow(() -> new IllegalArgumentException("Refund not found."));
    }

    private void syncPending(Payment payment, Booking booking) {
        payment.setStatus(PaymentStatus.REFUND_PENDING);
        booking.setPaymentStatus(PaymentStatus.REFUND_PENDING);
        payments.save(payment);
        bookings.save(booking);
    }

    private void syncAfterFailure(Payment payment, Booking booking) {
        BigDecimal completed = refunds.sumAmountByPaymentAndStatuses(payment.getId(), Set.of(RefundStatus.COMPLETED));
        PaymentStatus next = completed.signum() == 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_REFUNDED;
        payment.setStatus(next);
        booking.setPaymentStatus(next);
        payments.save(payment);
        bookings.save(booking);
    }

    private void applyCompletedTotals(Payment payment, Booking booking, LocalDateTime completedAt) {
        BigDecimal total = money(refunds.sumAmountByPaymentAndStatuses(payment.getId(), Set.of(RefundStatus.COMPLETED)));
        if (total.compareTo(payment.getAmount()) > 0) throw new IllegalStateException("Refund total exceeds the payment amount.");
        payment.setRefundAmount(total);
        payment.setRefundDate(completedAt);
        PaymentStatus next = total.compareTo(payment.getAmount()) == 0
                ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
        payment.setStatus(next);
        booking.setPaymentStatus(next);
        payments.save(payment);
        bookings.save(booking);
    }

    private BigDecimal remainingRefundable(Payment payment) {
        BigDecimal reserved = refunds.sumAmountByPaymentAndStatuses(payment.getId(), RESERVED_AMOUNT);
        return money(payment.getAmount()).subtract(money(reserved)).max(BigDecimal.ZERO).setScale(2);
    }

    private RefundPageResponse page(Page<Refund> page) {
        return new RefundPageResponse(page.getContent().stream().map(this::row).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private RefundListItemResponse row(Refund r) {
        Booking b = r.getBooking();
        return new RefundListItemResponse(r.getPublicRefundId(), b.getId(), r.getPayment().getId(),
                r.getUser().getName(), r.getUser().getEmail(), b.getSlot().getParkingLot().getName(),
                b.getSlot().getSlotNumber(), r.getOriginalPaymentAmount(), r.getCancellationFee(),
                r.getApprovedRefundAmount(), r.getRefundMethod(), r.getTransactionReference(),
                r.getPayment().getPaymentMethod(), r.getRefundStatus().name(), r.getAttemptNumber(),
                r.getRequestedAt(), processedAt(r));
    }

    private RefundDetailResponse detail(Refund r) {
        Booking b = r.getBooking();
        List<RefundDetailResponse.RefundTimelineItem> timeline = new ArrayList<>();
        addTimeline(timeline, "REQUESTED", r.getRequestedAt(), "Refund request received.");
        addTimeline(timeline, "INITIATED", r.getInitiatedAt(), "Refund initiated.");
        addTimeline(timeline, "PROCESSING", r.getProcessingAt(), "Refund processing started.");
        addTimeline(timeline, "COMPLETED", r.getCompletedAt(), "Refund completed.");
        addTimeline(timeline, "FAILED", r.getFailedAt(), "Refund processing failed.");
        List<RefundDetailResponse.RefundAttemptItem> attempts = refunds.findByPaymentIdOrderByAttemptNumberAsc(r.getPayment().getId())
                .stream().map(item -> new RefundDetailResponse.RefundAttemptItem(item.getPublicRefundId(),
                        item.getAttemptNumber(), item.getRefundStatus().name(), item.getApprovedRefundAmount(),
                        item.getRequestedAt(), item.getCompletedAt(), item.getFailedAt())).toList();
        return new RefundDetailResponse(r.getPublicRefundId(), r.getPayment().getId(), b.getId(),
                r.getUser().getName(), r.getUser().getEmail(), b.getSlot().getParkingLot().getName(),
                b.getSlot().getSlotNumber(), b.getStartTime(), b.getEndTime(), b.getCancelledAt(),
                b.getCancellationReason(), r.getOriginalPaymentAmount(), r.getCancellationFee(),
                r.getApprovedRefundAmount(), r.getCurrency(), r.getPayment().getPaymentMethod(),
                r.getRefundMethod(), r.getTransactionReference(), r.getRefundStatus().name(),
                r.getAttemptNumber(), r.getRequestedBy(), r.getFailureReason(), r.getRetryReason(),
                r.getRequestedAt(), r.getInitiatedAt(), r.getProcessingAt(), r.getCompletedAt(),
                r.getFailedAt(), timeline, attempts);
    }

    private void addTimeline(List<RefundDetailResponse.RefundTimelineItem> timeline, String status,
                             LocalDateTime time, String message) {
        if (time != null) timeline.add(new RefundDetailResponse.RefundTimelineItem(status, time, message));
    }

    private LocalDateTime processedAt(Refund refund) {
        return Optional.ofNullable(refund.getCompletedAt())
                .orElse(Optional.ofNullable(refund.getFailedAt()).orElse(refund.getProcessingAt()));
    }

    private BigDecimal sum(List<Refund> rows, Set<RefundStatus> statuses) {
        BigDecimal total = BigDecimal.ZERO;
        for (Refund refund : rows) {
            if (statuses.contains(refund.getRefundStatus())) {
                total = total.add(money(refund.getApprovedRefundAmount()));
            }
        }
        return money(total);
    }

    private long count(List<Refund> rows, RefundStatus status) {
        return rows.stream().filter(r -> r.getRefundStatus() == status).count();
    }

    private BigDecimal money(BigDecimal value) {
        return Optional.ofNullable(value).orElse(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }
    private Sort refundSort() { return Sort.sort(Refund.class).by(Refund::getCreatedAt).descending(); }
    private int validPage(int page) { return Math.max(0, page); }
    private int validSize(int size) { return Math.min(100, Math.max(1, size)); }
    private String nextPublicId() { return "RF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT); }
    pri