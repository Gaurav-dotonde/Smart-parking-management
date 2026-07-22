package com.parking.dto;
import java.math.BigDecimal; import java.time.LocalDateTime;
public record AdminPaymentResponse(Long id,Long bookingId,String userName,String vehicleNumber,BigDecimal amount,String paymentMethod,String transactionReference,String status,LocalDateTime paymentDate,BigDecimal refundAmount,LocalDateTime refundDate,LocalDateTime createdAt){}
