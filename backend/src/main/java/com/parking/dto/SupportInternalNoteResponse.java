package com.parking.dto;

import java.time.LocalDateTime;

public record SupportInternalNoteResponse(Long id, Long authorId, String authorName, String note, LocalDateTime createdAt) {}
