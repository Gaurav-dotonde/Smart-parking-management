package com.parking.dto;
import jakarta.validation.constraints.*;
public record SupportTicketRequest(
    @NotBlank @Size(max=80) String subject,
    @NotBlank @Size(max=30) String category,
    @NotBlank @Size(min=10,max=1500) String message
) {}
