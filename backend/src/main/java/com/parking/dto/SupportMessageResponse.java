package com.parking.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SupportMessageResponse(
        Long id,
        String senderName,
        String senderRole,
        String message,
        LocalDateTime createdAt,
        List<SupportAttachmentResponse> attachments
) {}
