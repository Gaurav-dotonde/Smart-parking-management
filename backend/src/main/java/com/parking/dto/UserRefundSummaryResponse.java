package com.parking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserRefundSummaryResponse(
        BigDecimal totalRefundedAmount,
        BigDecimal pendingRefundAmount,
        long completedRefundCount,
        long processingRefundCount,
        long failedRefundCount,
        String latestRefundStatus,
        String latestRefundId,
        LocalDateTime latestRefundUpdatedAt
) {}
