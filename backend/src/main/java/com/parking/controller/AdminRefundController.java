package com.parking.controller;

import com.parking.dto.*;
import com.parking.model.Refund;
import com.parking.model.RefundStatus;
import com.parking.service.RefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/refunds")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRefundController {
    private final RefundService refundService;

    @GetMapping("/summary")
    public AdminRefundSummaryResponse summary() {
        return refundService.adminSummary();
    }

    @GetMapping
    public RefundPageResponse list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (from != null && to != null && to.isBefore(from)) throw new IllegalArgumentException("Invalid date range.");
        return refundService.listAdmin(parse(status), from == null ? null : from.atStartOfDay(),
                to == null ? null : to.plusDays(1).atStartOfDay().minusNanos(1),
                paymentMethod, locationId, query, page, size);
    }

    @GetMapping("/{refundId}")
    public RefundDetailResponse detail(@PathVariable String refundId) {
        return refundService.adminDetail(refundId);
    }

    @PostMapping("/{refundId}/retry")
    public RefundDetailResponse retry(@PathVariable String refundId, @Valid @RequestBody RefundRetryRequest request) {
        Refund retry = refundService.retry(refundId, request.reason());
        return refundService.adminDetail(retry.getPublicRefundId());
    }

    private RefundStatus parse(String value) {
        if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value)) return null;
        try {
            return RefundStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid refund status.");
        }
    }
}
