package com.parking.dto;
import jakarta.validation.constraints.*;
public record SupportTicketRequest(
    @NotBlank @Size(max=80) String subject,
    @NotBlank @Size(max=40) String category,
    @NotBlank @Size(min=20,max=4000) String message,
    @Size(max=50) String bookingId,
    @Size(max=80) String transactionId
) {}
