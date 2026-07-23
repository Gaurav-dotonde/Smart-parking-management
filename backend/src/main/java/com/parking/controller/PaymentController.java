package com.parking.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.parking.dto.PaymentResponse;
import com.parking.model.User;
import com.parking.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Reserved user-facing payment API boundary.
 * Intentionally exposes no endpoints until a gateway is integrated.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;
    @GetMapping("/booking/{bookingId}")
    public PaymentResponse get(@AuthenticationPrincipal User user, @PathVariable Long bookingId) {
        return paymentService.get(user, bookingId);
    }
    @PutMapping("/booking/{bookingId}/pay")
    public PaymentResponse pay(@AuthenticationPrincipal User user, @PathVariable Long bookingId) {
        return paymentService.pay(user, bookingId);
    }
}
