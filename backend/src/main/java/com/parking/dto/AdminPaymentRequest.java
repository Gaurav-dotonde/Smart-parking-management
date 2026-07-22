package com.parking.dto;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
@Data public class AdminPaymentRequest {
 @NotNull private Long bookingId;
 @NotNull @DecimalMin("0.00") private BigDecimal amount;
 @NotBlank private String paymentMethod;
 private String transactionReference;
 @NotBlank private String status;
}
