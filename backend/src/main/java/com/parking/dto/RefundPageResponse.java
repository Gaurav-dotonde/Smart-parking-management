package com.parking.dto;

import java.util.List;

public record RefundPageResponse(
        List<RefundListItemResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
