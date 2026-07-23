package com.parking.dto;
import java.time.LocalDateTime;
public record SupportTicketResponse(Long id, Long userId, String userName, String userEmail,
 String subject, String category, String message, String status, String adminReply,
 LocalDateTime createdAt, LocalDateTime updatedAt) {}
