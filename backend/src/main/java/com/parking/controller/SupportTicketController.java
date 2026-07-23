package com.parking.controller;

import com.parking.dto.*;
import com.parking.model.*;
import com.parking.repository.SupportTicketRepository;
import com.parking.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@RestController @RequiredArgsConstructor
public class SupportTicketController {
    private final SupportTicketRepository repository;
    private final UserRepository userRepository;

    @PostMapping("/api/support/tickets")
    @Transactional
    public ResponseEntity<SupportTicketResponse> create(@AuthenticationPrincipal User user, @Valid @RequestBody SupportTicketRequest request) {
        User managedUser = userRepository.findById(user.getId())
            .orElseThrow(() -> new IllegalArgumentException("User account not found."));
        SupportTicket ticket = repository.saveAndFlush(SupportTicket.builder().user(managedUser).subject(request.subject().trim())
            .category(request.category()).message(request.message().trim()).build());
        return ResponseEntity.status(201).body(toResponse(ticket));
    }

    @GetMapping("/api/support/tickets/mine")
    @Transactional(readOnly = true)
    public List<SupportTicketResponse> mine(@AuthenticationPrincipal User user) {
        return repository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::toResponse).toList();
    }

    @GetMapping("/api/admin/support")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<SupportTicketResponse> all() {
        return repository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    @PutMapping("/api/admin/support/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public SupportTicketResponse update(@PathVariable Long id, @RequestBody AdminUpdate request) {
        SupportTicket ticket = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        if (request.status() != null) ticket.setStatus(request.status());
        if (request.adminReply() != null) ticket.setAdminReply(request.adminReply().trim());
        return toResponse(repository.save(ticket));
    }

    private SupportTicketResponse toResponse(SupportTicket t) {
        return new SupportTicketResponse(t.getId(), t.getUser().getId(), t.getUser().getName(), t.getUser().getEmail(),
            t.getSubject(), t.getCategory(), t.getMessage(), t.getStatus(), t.getAdminReply(), t.getCreatedAt(), t.getUpdatedAt());
    }
    public record AdminUpdate(String status, String adminReply) {}
}
