package com.parking.service;

import com.parking.dto.*;
import com.parking.model.*;
import com.parking.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SupportTicketWorkflowTest {
    @Mock SupportTicketRepository tickets;
    @Mock SupportMessageRepository messages;
    @Mock SupportAttachmentRepository attachments;
    @Mock SupportStatusHistoryRepository history;
    @Mock SupportInternalNoteRepository notes;
    @Mock UserRepository users;
    private SupportTicketService service;
    private User user;
    private User otherUser;
    private User admin;
    private SupportTicket ticket;

    @BeforeEach
    void setUp() {
        service = new SupportTicketService(tickets, messages, attachments, history, notes, users);
        user = account(1L, "User", Role.USER);
        otherUser = account(2L, "Other", Role.USER);
        admin = account(3L, "Admin", Role.ADMIN);
        ticket = SupportTicket.builder().id(10L).ticketNumber("SUP-000010").user(user).subject("Issue")
                .category("OTHER").message("A sufficiently detailed support issue.").status(SupportStatus.OPEN)
                .priority(SupportPriority.MEDIUM).createdAt(LocalDateTime.now()).build();
        lenient().when(users.findById(1L)).thenReturn(Optional.of(user));
        lenient().when(users.findById(2L)).thenReturn(Optional.of(otherUser));
        lenient().when(users.findById(3L)).thenReturn(Optional.of(admin));
        lenient().when(tickets.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(messages.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(history.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(messages.findByTicketIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
        lenient().when(attachments.findByTicketIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
        lenient().when(history.findByTicketIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
        lenient().when(notes.findByTicketIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
    }

    @Test void newTicketDefaultsToOpen() {
        when(tickets.saveAndFlush(any())).thenAnswer(invocation -> {
            SupportTicket saved = invocation.getArgument(0); saved.setId(11L); return saved;
        });
        SupportTicketDetailResponse result = service.createTicket(user,
                new SupportTicketRequest("Help", "Other", "This description is long enough for validation.", null, null), List.of());
        assertEquals("OPEN", result.status());
    }

    @Test void adminCanStartOpenTicket() {
        when(tickets.findById(10L)).thenReturn(Optional.of(ticket));
        SupportTicketDetailResponse result = service.updateAdminTicket(10L, admin,
                new SupportTicketUpdateRequest("IN_PROGRESS", null, null, null));
        assertEquals("IN_PROGRESS", result.status());
    }

    @Test void adminCanResolveWithSummary() {
        when(tickets.findById(10L)).thenReturn(Optional.of(ticket));
        SupportTicketDetailResponse result = service.resolveTicket(10L, admin, new SupportResolveRequest("Fixed configuration.", null, null));
        assertEquals("RESOLVED", result.status());
        assertNotNull(result.resolvedAt());
        assertEquals("Fixed configuration.", result.resolutionSummary());
    }

    @Test void blankResolutionIsRejected() {
        when(tickets.findById(10L)).thenReturn(Optional.of(ticket));
        assertThrows(IllegalArgumentException.class,
                () -> service.resolveTicket(10L, admin, new SupportResolveRequest("   ", null, null)));
    }

    @Test void openTicketCannotBeClosed() {
        when(tickets.findById(10L)).thenReturn(Optional.of(ticket));
        assertThrows(IllegalArgumentException.class, () -> service.closeAsAdmin(10L, admin));
    }

    @Test void userCannotReadAnotherUsersTicket() {
        when(tickets.findByIdAndUserId(10L, 2L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.getMyTicketDetail(otherUser, 10L));
    }

    @Test void resolvedTicketCanBeReopenedWithinSevenDays() {
        ticket.setStatus(SupportStatus.RESOLVED);
        ticket.setResolvedAt(LocalDateTime.now().minusDays(1));
        when(tickets.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(ticket));
        assertEquals("IN_PROGRESS", service.reopenAsUser(10L, user).status());
    }

    @Test void invalidTransitionIsRejected() {
        ticket.setStatus(SupportStatus.CLOSED);
        when(tickets.findById(10L)).thenReturn(Optional.of(ticket));
        assertThrows(IllegalArgumentException.class, () -> service.updateAdminTicket(10L, admin,
                new SupportTicketUpdateRequest("WAITING_FOR_USER", null, null, null)));
    }

    @Test void adminReplyIsPersistedWithoutResolving() {
        when(tickets.findById(10L)).thenReturn(Optional.of(ticket));
        service.replyAsAdmin(10L, admin, new SupportReplyRequest("We are investigating this issue."), List.of());
        verify(messages).save(argThat(message -> message.getSenderRole() == SupportMessageRole.ADMIN
                && message.getMessage().equals("We are investigating this issue.")));
        assertEquals(SupportStatus.IN_PROGRESS, ticket.getStatus());
    }

    @Test void userDetailNeverLoadsInternalNotes() {
        when(tickets.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(ticket));
        assertTrue(service.getMyTicketDetail(user, 10L).internalNotes().isEmpty());
        verify(notes, never()).findByTicketIdOrderByCreatedAtAsc(any());
    }

    private User account(Long id, String name, Role role) {
        return User.builder().id(id).name(name).email(name.toLowerCase() + "@test.local")
                .password("x").role(role).archived(false).build();
    }
}
