package com.parking.dto;

import java.time.LocalDateTime;

public record SupportAttachmentResponse(
        Long id,
        String originalFileName,
        String fileUrl,
        String contentType,
        Long fileSize,
        LocalDateTime createdAt
) {}
