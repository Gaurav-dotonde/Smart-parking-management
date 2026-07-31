package com.parking.dto;

import java.math.BigDecimal;

public record AdminRefundSummaryResponse(
        BigDecimal totalRefundAmount,
        long pendingRefundCount,
        long processingRefundCount,
        long completedRefundCount,
        long failedRefundCount,
        BigDecimal todayRefundAmount,
        BigDecimal thisMonthRefundAmount
) {}
