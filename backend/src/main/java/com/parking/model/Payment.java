package com.parking.model;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name="payments") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="booking_id", nullable=false) private Booking booking;
 @Column(nullable=false, precision=12, scale=2) private BigDecimal amount;
 @Column(nullable=false, length=3) @Builder.Default private String currency="INR";
 @Column(name="payment_method", nullable=false) private String paymentMethod;
 @Column(name="transaction_reference", unique=true) private String transactionReference;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private PaymentStatus status;
 @Column(name="payment_date") private LocalDateTime paymentDate;
 @Column(name="refund_amount", precision=12, scale=2) @Builder.Default private BigDecimal refundAmount=BigDecimal.ZERO;
 @Column(name="refund_date") private LocalDateTime refundDate;
 @Column(name="failure_reason") private String failureReason;
 @Column(name="created_at", nullable=false, updatable=false) @Builder.Default private LocalDateTime createdAt=LocalDateTime.now();
 @Column(name="updated_at") private LocalDateTime updatedAt;
 @PreUpdate void update(){updatedAt=LocalDateTime.now();}
}
