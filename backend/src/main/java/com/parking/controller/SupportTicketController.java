package com.parking.controller;

import com.parking.dto.SupportReplyRequest;
import com.parking.dto.SupportSummaryResponse;
import com.parking.dto.SupportTicketDetailResponse;
import com.parking.dto.SupportTicketPageResponse;
import com.parking.dto.SupportTicketRequest;
import com.parking.dto.SupportTicketUpdateRequest;
import com.parking.model.User;
import com.parking.service.SupportTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Validated
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    @PostMapping(value = "/support/tickets", consumes = "application/json")
    public ResponseEntity<SupportTicketDetailResponse> createTicket(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SupportTicketRequest request
    ) {
        return ResponseEntity.ok(supportTicketService.createTicket(user, request, List.of()));
    }

    @PostMapping(value = "/support/tickets", consumes = "multipart/form-data")
    public ResponseEntity<SupportTicketDetailResponse> createTicketMultipart(
            @AuthenticationPrincipal User user,
            @Valid @ModelAttribute SupportTicketRequest request,
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments
    ) {
        return ResponseEntity.ok(supportTicketService.createTicket(user, request, attachments));
    }

    @GetMapping("/support/tickets/mine")
    public ResponseEntity<?> myTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        if (page != null || size != null) {
            SupportTicketPageResponse response = supportTicketService.getMyTickets(
                    user,
                    query,
                    status,
                    page == null ? 0 : page,
                    size == null ? 10 : size
            );
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.ok(supportTicketService.getMyTickets(user));
    }

    @GetMapping("/support/tickets/summary")
    public ResponseEntity<SupportSummaryResponse> summary(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supportTicketService.getMySummary(user));
    }

    @GetMapping("/support/tickets/{id}")
    public ResponseEntity<SupportTicketDetailResponse> ticket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(supportTicketService.getMyTicketDetail(user, id));
    }

    @PostMapping(value = "/support/tickets/{id}/reply", consumes = "application/json")
    public ResponseEntity<SupportTicketDetailResponse> reply(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody SupportReplyRequest request
    ) {
        return ResponseEntity.ok(supportTicketService.replyAsUser(user, id, request, List.of()));
    }

    @PostMapping(value = "/support/tickets/{id}/reply", consumes = "multipart/form-data")
    public ResponseEntity<SupportTicketDetailResponse> replyMultipart(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @ModelAttribute SupportReplyRequest request,
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments
    ) {
        return ResponseEntity.ok(supportTicketService.replyAsUser(user, id, request, attachments));
    }

    @PostMapping("/support/tickets/{id}/close")
    public ResponseEntity<SupportTicketDetailResponse> closeTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(supportTicketService.closeTicket(user, id));
    }

    @GetMapping("/admin/support")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        if (page != null || size != null) {
            return ResponseEntity.ok(supportTicketService.getAdminTickets(
                    query,
                    status,
                    category,
                    priority,
                    date,
                    page == null ? 0 : page,
                    size == null ? 10 : size
            ));
        }
        return ResponseEntity.ok(supportTicketService.getAdminTickets());
    }

    @GetMapping("/admin/support/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportSummaryResponse> adminSummary(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supportTicketService.getAdminSummary());
    }

    @GetMapping("/admin/support/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> adminTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(supportTicketService.getAdminTicketDetail(id, user));
    }

    @PutMapping("/admin/support/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> updateAdminTicket(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody SupportTicketUpdateRequest request
    ) {
        return ResponseEntity.ok(supportTicketService.updateAdminTicket(id, user, request));
    }

    @PostMapping(value = "/admin/support/{id}/reply", consumes = "application/json")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> replyAsAdmin(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody SupportReplyRequest request
    ) {
        return ResponseEntity.ok(supportTicketService.replyAsAdmin(id, user, request, List.of()));
    }

    @PostMapping(value = "/admin/support/{id}/reply", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> replyAsAdminMultipart(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @ModelAttribute SupportReplyRequest request,
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments
    ) {
        return ResponseEntity.ok(supportTicketService.replyAsAdmin(id, user, request, attachments));
    }
}
