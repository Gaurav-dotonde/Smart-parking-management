package com.parking.controller;
import com.parking.dto.*; import com.parking.service.AdminPaymentService; import jakarta.validation.Valid; import lombok.RequiredArgsConstructor; import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.math.BigDecimal; import java.util.List;
@RestController @RequestMapping("/api/admin/payments") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')") public class AdminPaymentController{
 private final AdminPaymentService service;
 @GetMapping public List<AdminPaymentResponse> list(){return service.list();}@GetMapping("/{id}") public AdminPaymentResponse get(@PathVariable Long id){return service.get(id);}
 @PostMapping public ResponseEntity<AdminPaymentResponse> create(@Valid @RequestBody AdminPaymentRequest r){return ResponseEntity.status(201).body(service.create(r));}
 @PutMapping("/{id}/verify") public AdminPaymentResponse verify(@PathVariable Long id){return service.verify(id);}
 @PutMapping("/{id}/refund") public AdminPaymentResponse refund(@PathVariable Long id,@RequestParam BigDecimal amount){return service.refund(id,amount);}
}
