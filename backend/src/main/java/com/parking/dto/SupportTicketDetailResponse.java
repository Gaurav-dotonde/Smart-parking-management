package com.parking.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SupportTicketDetailResponse(
        Long id,
        String ticketNumber,
        Long userId,
        String userName,
        String userEmail,
        String subject,
        String category,
        String message,
        String bookingId,
        String transactionId,
        String status,
        String priority,
        String assignedToName,
        String assignedToEmail,
        String internalNotes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime closedAt,
        List<SupportMessageResponse> messages,
        List<SupportAttachmentResponse> attachments,
        List<SupportStatusHistoryResponse> history,
        boolean canReply,
        boolean canClose
) {}
