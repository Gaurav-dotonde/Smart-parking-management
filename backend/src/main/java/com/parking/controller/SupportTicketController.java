package com.parking.controller;

import com.parking.dto.*;
import com.parking.model.User;
import com.parking.service.SupportTicketService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
            @RequestParam @NotBlank @Size(max = 40) String category,
            @RequestParam @NotBlank @Size(max = 80) String subject,
            @RequestParam @NotBlank @Size(min = 20, max = 4000) String message,
            @RequestParam(required = false) @Size(max = 50) String bookingId,
            @RequestParam(required = false) @Size(max = 80) String transactionId,
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments
    ) {
        SupportTicketRequest request = new SupportTicketRequest(
                subject,
                category,
                message,
                bookingId,
                transactionId
        );
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

    @PostMapping("/support/tickets/{id}/reopen")
    public ResponseEntity<SupportTicketDetailResponse> reopenTicket(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(supportTicketService.reopenAsUser(id, user));
    }

    @PostMapping("/support/tickets/{id}/cancel")
    public ResponseEntity<SupportTicketDetailResponse> cancelTicket(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(supportTicketService.cancelAsUser(id, user));
    }

    @GetMapping("/admin/support")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminTickets(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long assignedToId,
            @RequestParam(defaultValue = "false") boolean assignedToMe,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "updatedAt,desc") String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        if (page != null || size != null) {
            return ResponseEntity.ok(supportTicketService.getAdminTickets(
                    user,
                    query,
                    status,
                    category,
                    priority,
                    assignedToId,
                    assignedToMe,
                    from,
                    to,
                    sort,
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

    @PatchMapping("/admin/support/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> assign(@AuthenticationPrincipal User user, @PathVariable Long id,
                                                               @RequestBody SupportAssignRequest request) {
        return ResponseEntity.ok(supportTicketService.assignTicket(id, user, request.assignedAdminId()));
    }

    @PostMapping("/admin/support/{id}/internal-notes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> note(@AuthenticationPrincipal User user, @PathVariable Long id,
                                                             @Valid @RequestBody SupportInternalNoteRequest request) {
        return ResponseEntity.ok(supportTicketService.addInternalNote(id, user, request.note()));
    }

    @PostMapping("/admin/support/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> resolve(@AuthenticationPrincipal User user, @PathVariable Long id,
                                                                @Valid @RequestBody SupportResolveRequest request) {
        return ResponseEntity.ok(supportTicketService.resolveTicket(id, user, request));
    }

    @PostMapping("/admin/support/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> close(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(supportTicketService.closeAsAdmin(id, user));
    }

    @PostMapping("/admin/support/{id}/reopen")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketDetailResponse> reopen(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(supportTicketService.reopenAsAdmin(id, user));
    }
}
