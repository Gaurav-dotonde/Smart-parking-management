package com.parking.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reserved user-facing payment API boundary.
 * Intentionally exposes no endpoints until a gateway is integrated.
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    // Reserved for gateway initiation, callback, and webhook endpoints.
}
