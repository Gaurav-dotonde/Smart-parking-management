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
        Long assignedToId,
        LocalDateTime assignedAt,
        String resolutionSummary,
        LocalDateTime resolvedAt,
        String resolvedByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime closedAt,
        String closedByName,
        List<SupportMessageResponse> messages,
        List<SupportAttachmentResponse> attachments,
        List<SupportStatusHistoryResponse> history,
        List<SupportInternalNoteResponse> internalNotes,
        boolean canReply,
        boolean canClose,
        boolean canReopen
) {}
