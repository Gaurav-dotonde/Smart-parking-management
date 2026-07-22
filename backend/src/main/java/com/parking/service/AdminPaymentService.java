package com.parking.service;
import com.parking.dto.*; import com.parking.model.*; import com.parking.repository.*;
import lombok.RequiredArgsConstructor; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.*; import java.time.LocalDateTime; import java.util.*;
@Service @RequiredArgsConstructor public class AdminPaymentService {
 private final PaymentRepository payments; private final BookingRepository bookings;
 public List<AdminPaymentResponse> list(){return payments.findAllByOrderByCreatedAtDesc().stream().map(this::out).toList();}
 public AdminPaymentResponse get(Long id){return out(find(id));}
 @Transactional public AdminPaymentResponse create(AdminPaymentRequest r){
  Booking b=bookings.findById(r.getBookingId()).orElseThrow(()->new IllegalArgumentException("Booking not found."));
  String ref=clean(r.getTransactionReference()); if(ref!=null&&payments.existsByTransactionReference(ref))throw new IllegalArgumentException("Transaction reference already exists.");
  PaymentStatus status=parse(r.getStatus()); Payment p=Payment.builder().booking(b).amount(r.getAmount()).paymentMethod(r.getPaymentMethod().trim()).transactionReference(ref).status(status).paymentDate(status==PaymentStatus.PAID?LocalDateTime.now():null).build();
  sync(b,status); return out(payments.save(p));
 }
 @Transactional public AdminPaymentResponse verify(Long id){Payment p=find(id); if(p.getStatus()!=PaymentStatus.PENDING&&p.getStatus()!=PaymentStatus.UNPAID)throw new IllegalStateException("Only pending payments can be verified."); p.setStatus(PaymentStatus.PAID);p.setPaymentDate(LocalDateTime.now());sync(p.getBooking(),p.getStatus());return out(payments.save(p));}
 @Transactional public AdminPaymentResponse refund(Long id,BigDecimal amount){Payment p=find(id);if(p.getStatus()!=PaymentStatus.PAID&&p.getStatus()!=PaymentStatus.PARTIALLY_REFUNDED)throw new IllegalStateException("Only paid payments can be refunded.");BigDecimal prior=Optional.ofNullable(p.getRefundAmount()).orElse(BigDecimal.ZERO);BigDecimal total=prior.add(amount);if(amount.signum()<=0||total.compareTo(p.getAmount())>0)throw new IllegalArgumentException("Invalid refund amount.");p.setRefundAmount(total);p.setRefundDate(LocalDateTime.now());p.setStatus(total.compareTo(p.getAmount())==0?PaymentStatus.REFUNDED:PaymentStatus.PARTIALLY_REFUNDED);sync(p.getBooking(),p.getStatus());return out(payments.save(p));}
 private void sync(Booking b,PaymentStatus s){b.setPaymentStatus(s);bookings.save(b);} private Payment find(Long id){return payments.findById(id).orElseThrow(()->new IllegalArgumentException("Payment not found."));}
 private PaymentStatus parse(String s){try{return PaymentStatus.valueOf(s.trim().toUpperCase(Locale.ROOT));}catch(Exception e){throw new IllegalArgumentException("Invalid payment status.");}}
 private String clean(String s){return s==null||s.isBlank()?null:s.trim();}
 private AdminPaymentResponse out(Payment p){Booking b=p.getBooking();return new AdminPaymentResponse(p.getId(),b.getId(),b.getUser().getName(),b.getVehicleNumber(),p.getAmount(),p.getPaymentMethod(),p.getTransactionReference(),p.getStatus().name(),p.getPaymentDate(),p.getRefundAmount(),p.getRefundDate(),p.getCreatedAt());}
}
