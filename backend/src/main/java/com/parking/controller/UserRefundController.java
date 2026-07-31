package com.parking.controller;

import com.parking.dto.*;
import com.parking.model.RefundStatus;
import com.parking.model.User;
import com.parking.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user/refunds")
@RequiredArgsConstructor
public class UserRefundController {
    private final RefundService refundService;

    @GetMapping("/summary")
    public UserRefundSummaryResponse summary(@AuthenticationPrincipal User user) {
        return refundService.userSummary(user.getId());
    }

    @GetMapping
    public RefundPageResponse list(@AuthenticationPrincipal User user,
                                   @RequestParam(required = false) String status,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "10") int size) {
        return refundService.listUser(user.getId(), parse(status), page, size);
    }

    @GetMapping("/{refundId}")
    public RefundDetailResponse detail(@AuthenticationPrincipal User user, @PathVariable String refundId) {
        return refundService.userDetail(user.getId(), refundId);
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
