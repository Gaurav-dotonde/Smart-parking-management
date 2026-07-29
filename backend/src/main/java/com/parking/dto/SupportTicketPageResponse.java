package com.parking.dto;

import java.util.List;

public record SupportTicketPageResponse(
        List<SupportTicketResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {}
