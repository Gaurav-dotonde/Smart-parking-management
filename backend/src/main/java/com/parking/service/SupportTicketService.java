package com.parking.service;

import com.parking.dto.*;
import com.parking.model.*;
import com.parking.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class SupportTicketService {

    private static final long MAX_ATTACHMENT_SIZE = 5L * 1024L * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "application/pdf"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".pdf");
    private static final Set<String> VALID_CATEGORIES = Set.of(
            "PAYMENT_ISSUE",
            "BOOKING_ISSUE",
            "REFUND_ISSUE",
            "CHECK_IN_ISSUE",
            "CHECK_OUT_ISSUE",
            "PARKING_SLOT_ISSUE",
            "TECHNICAL_ISSUE",
            "ACCOUNT_ISSUE",
            "OTHER"
    );
    private final SupportTicketRepository ticketRepository;
    private final SupportMessageRepository messageRepository;
    private final SupportAttachmentRepository attachmentRepository;
    private final SupportStatusHistoryRepository historyRepository;
    private final SupportInternalNoteRepository internalNoteRepository;
    private final UserRepository userRepository;

    public SupportTicketDetailResponse createTicket(User currentUser, SupportTicketRequest request, List<MultipartFile> files) {
        User managedUser = requireManagedUser(currentUser);
        SupportTicket ticket = SupportTicket.builder()
                .user(managedUser)
                .subject(trimToNull(request.subject()))
                .category(normalizeCategory(request.category()))
                .message(trimToNull(request.message()))
                .bookingId(trimToNull(request.bookingId()))
                .transactionId(trimToNull(request.transactionId()))
                .status(SupportStatus.OPEN)
                .priority(SupportPriority.MEDIUM)
                .build();
        ticket = ticketRepository.saveAndFlush(ticket);
        ticket.setTicketNumber(formatTicketNumber(ticket.getId()));
        ticket = ticketRepository.save(ticket);

        SupportMessage message = saveMessage(ticket, managedUser, SupportMessageRole.USER, ticket.getMessage(), false);
        saveAttachments(ticket, message, managedUser, files);
        recordHistory(ticket, null, SupportStatus.OPEN, managedUser, "Ticket created.");
        return toDetail(ticket, managedUser, false);
    }

    public SupportTicketPageResponse getMyTickets(User currentUser, String query, String status, int page, int size) {
        User managedUser = requireManagedUser(currentUser);
        List<SupportTicket> tickets = ticketRepository.findAll(userSpecification(managedUser.getId(), query, status));
        tickets = sortTickets(tickets);
        return toPage(tickets, Math.max(page, 0), clampPageSize(size), false);
    }

    public List<SupportTicketResponse> getMyTickets(User currentUser) {
        User managedUser = requireManagedUser(currentUser);
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(managedUser.getId()).stream()
                .map(ticket -> toListResponse(ticket, false))
                .toList();
    }

    public SupportSummaryResponse getMySummary(User currentUser) {
        User managedUser = requireManagedUser(currentUser);
        return new SupportSummaryResponse(
                ticketRepository.countByUserId(managedUser.getId()),
                ticketRepository.countByUserIdAndStatus(managedUser.getId(), SupportStatus.OPEN),
                ticketRepository.countByUserIdAndStatus(managedUser.getId(), SupportStatus.IN_PROGRESS),
                ticketRepository.countByUserIdAndStatus(managedUser.getId(), SupportStatus.WAITING_FOR_USER),
                ticketRepository.countByUserIdAndStatus(managedUser.getId(), SupportStatus.RESOLVED),
                ticketRepository.countByUserIdAndStatus(managedUser.getId(), SupportStatus.CLOSED),
                0, 0, 0,
                ticketRepository.countByUserIdAndStatus(managedUser.getId(), SupportStatus.CANCELLED)
        );
    }

    public SupportTicketDetailResponse getMyTicketDetail(User currentUser, Long ticketId) {
        User managedUser = requireManagedUser(currentUser);
        SupportTicket ticket = ticketRepository.findByIdAndUserId(ticketId, managedUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        return toDetail(ticket, managedUser, false);
    }

    public SupportTicketDetailResponse replyAsUser(User currentUser, Long ticketId, SupportReplyRequest request, List<MultipartFile> files) {
        User managedUser = requireManagedUser(currentUser);
        SupportTicket ticket = ticketRepository.findByIdAndUserId(ticketId, managedUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        if (!Set.of(SupportStatus.OPEN, SupportStatus.IN_PROGRESS, SupportStatus.WAITING_FOR_USER).contains(ticket.getStatus())) {
            throw new IllegalStateException("This ticket must be reopened before another reply can be sent.");
        }
        SupportStatus previous = ticket.getStatus();
        if (ticket.getStatus() == SupportStatus.WAITING_FOR_USER) {
            ticket.setStatus(SupportStatus.IN_PROGRESS);
        }
        SupportMessage message = saveMessage(ticket, managedUser, SupportMessageRole.USER, trimToNull(request.message()), false);
        saveAttachments(ticket, message, managedUser, files);
        recordHistory(ticket, previous, ticket.getStatus(), managedUser, "User replied.");
        return toDetail(ticket, managedUser, false);
    }

    public SupportTicketDetailResponse closeTicket(User currentUser, Long ticketId) {
        User managedUser = requireManagedUser(currentUser);
        SupportTicket ticket = ticketRepository.findByIdAndUserId(ticketId, managedUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        if (ticket.getStatus() != SupportStatus.RESOLVED) {
            throw new IllegalStateException("Only resolved tickets can be closed.");
        }
        SupportStatus previous = ticket.getStatus();
        ticket.setStatus(SupportStatus.CLOSED);
        ticket.setClosedAt(LocalDateTime.now());
        ticketRepository.save(ticket);
        recordHistory(ticket, previous, SupportStatus.CLOSED, managedUser, "User closed the ticket.");
        return toDetail(ticket, managedUser, false);
    }

    public SupportTicketPageResponse getAdminTickets(User adminUser, String query, String status, String category, String priority,
                                                      Long assignedToId, boolean assignedToMe, LocalDate from, LocalDate to,
                                                      String sort, int page, int size) {
        User admin = requireAdminUser(adminUser);
        Long effectiveAssignee = assignedToMe ? admin.getId() : assignedToId;
        List<SupportTicket> tickets = ticketRepository.findAll(adminSpecification(query, status, category, priority, effectiveAssignee, from, to));
        tickets = sortTickets(tickets, sort);
        return toPage(tickets, Math.max(page, 0), clampPageSize(size), true);
    }

    public List<SupportTicketResponse> getAdminTickets() {
        return ticketRepository.findAllByOrderByCreatedAtDesc().stream().map(ticket -> toListResponse(ticket, true)).toList();
    }

    public SupportSummaryResponse getAdminSummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime from = today.atStartOfDay();
        LocalDateTime to = today.plusDays(1).atStartOfDay().minusNanos(1);
        return new SupportSummaryResponse(
                ticketRepository.count(),
                ticketRepository.countByStatus(SupportStatus.OPEN),
                ticketRepository.countByStatus(SupportStatus.IN_PROGRESS),
                ticketRepository.countByStatus(SupportStatus.WAITING_FOR_USER),
                ticketRepository.countByStatus(SupportStatus.RESOLVED),
                ticketRepository.countByStatus(SupportStatus.CLOSED),
                ticketRepository.countByCreatedAtBetween(from, to),
                ticketRepository.countByPriority(SupportPriority.URGENT),
                ticketRepository.countByAssignedToIsNull(),
                ticketRepository.countByStatus(SupportStatus.CANCELLED)
        );
    }

    public SupportTicketDetailResponse getAdminTicketDetail(Long ticketId, User adminUser) {
        User managedAdmin = requireAdminUser(adminUser);
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        return toDetail(ticket, managedAdmin, true);
    }

    public SupportTicketDetailResponse updateAdminTicket(Long ticketId, User adminUser, SupportTicketUpdateRequest request) {
        User managedAdmin = requireAdminUser(adminUser);
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        SupportStatus previousStatus = ticket.getStatus();
        if (request.priority() != null && !request.priority().isBlank()) {
            ticket.setPriority(parsePriority(request.priority()));
        }
        assign(ticket, request.assignedToId(), managedAdmin);
        if (request.internalNotes() != null) {
            addInternalNote(ticket, managedAdmin, request.internalNotes());
        }
        if (request.status() != null && !request.status().isBlank()) {
            SupportStatus target = parseStatus(request.status());
            if (target == SupportStatus.RESOLVED || target == SupportStatus.CLOSED) {
                throw new IllegalArgumentException("Use the dedicated resolve or close action for this status.");
            }
            transitionStatus(ticket, target);
        }
        ticket = ticketRepository.save(ticket);
        if (previousStatus != ticket.getStatus()) {
            recordHistory(ticket, previousStatus, ticket.getStatus(), managedAdmin, "Admin updated ticket status.");
        }
        return toDetail(ticket, managedAdmin, true);
    }

    public SupportTicketDetailResponse assignTicket(Long ticketId, User adminUser, Long assigneeId) {
        User admin = requireAdminUser(adminUser);
        SupportTicket ticket = requireTicket(ticketId);
        assign(ticket, assigneeId, admin);
        return toDetail(ticketRepository.save(ticket), admin, true);
    }

    public SupportTicketDetailResponse addInternalNote(Long ticketId, User adminUser, String note) {
        User admin = requireAdminUser(adminUser);
        SupportTicket ticket = requireTicket(ticketId);
        addInternalNote(ticket, admin, note);
        return toDetail(ticket, admin, true);
    }

    public SupportTicketDetailResponse resolveTicket(Long ticketId, User adminUser, SupportResolveRequest request) {
        User admin = requireAdminUser(adminUser);
        SupportTicket ticket = requireTicket(ticketId);
        String summary = trimToNull(request.resolutionSummary());
        if (summary == null) throw new IllegalArgumentException("Resolution summary is required.");
        SupportStatus previous = ticket.getStatus();
        transitionStatus(ticket, SupportStatus.RESOLVED);
        ticket.setResolutionSummary(summary);
        ticket.setResolutionNotes(trimToNull(request.resolutionNotes()));
        ticket.setResolvedAt(LocalDateTime.now());
        ticket.setResolvedBy(admin);
        ticket.setClosedAt(null);
        ticket.setClosedBy(null);
        String reply = trimToNull(request.reply());
        if (reply != null) saveMessage(ticket, admin, SupportMessageRole.ADMIN, reply, false);
        ticketRepository.save(ticket);
        recordHistory(ticket, previous, SupportStatus.RESOLVED, admin, "Ticket resolved: " + summary);
        return toDetail(ticket, admin, true);
    }

    public SupportTicketDetailResponse closeAsAdmin(Long ticketId, User adminUser) {
        User admin = requireAdminUser(adminUser);
        SupportTicket ticket = requireTicket(ticketId);
        SupportStatus previous = ticket.getStatus();
        transitionStatus(ticket, SupportStatus.CLOSED);
        ticket.setClosedAt(LocalDateTime.now());
        ticket.setClosedBy(admin);
        ticketRepository.save(ticket);
        recordHistory(ticket, previous, SupportStatus.CLOSED, admin, "Ticket closed by admin.");
        return toDetail(ticket, admin, true);
    }

    public SupportTicketDetailResponse reopenAsAdmin(Long ticketId, User adminUser) {
        User admin = requireAdminUser(adminUser);
        return reopen(requireTicket(ticketId), admin, true);
    }

    public SupportTicketDetailResponse reopenAsUser(Long ticketId, User currentUser) {
        User user = requireManagedUser(currentUser);
        SupportTicket ticket = ticketRepository.findByIdAndUserId(ticketId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        if (ticket.getStatus() != SupportStatus.RESOLVED || ticket.getResolvedAt() == null
                || ticket.getResolvedAt().plusDays(7).isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Resolved tickets can only be reopened within 7 days.");
        }
        return reopen(ticket, user, false);
    }

    public SupportTicketDetailResponse cancelAsUser(Long ticketId, User currentUser) {
        User user = requireManagedUser(currentUser);
        SupportTicket ticket = ticketRepository.findByIdAndUserId(ticketId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        if (!Set.of(SupportStatus.OPEN, SupportStatus.IN_PROGRESS, SupportStatus.WAITING_FOR_USER).contains(ticket.getStatus()))
            throw new IllegalStateException("This ticket cannot be cancelled in its current status.");
        SupportStatus previous = ticket.getStatus();
        ticket.setStatus(SupportStatus.CANCELLED);
        ticketRepository.save(ticket);
        recordHistory(ticket, previous, SupportStatus.CANCELLED, user, "Ticket cancelled by user.");
        return toDetail(ticket, user, false);
    }

    public SupportTicketDetailResponse replyAsAdmin(Long ticketId, User adminUser, SupportReplyRequest request, List<MultipartFile> files) {
        User managedAdmin = requireAdminUser(adminUser);
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
        if (ticket.getStatus() == SupportStatus.CLOSED || ticket.getStatus() == SupportStatus.CANCELLED) {
            throw new IllegalStateException("Reopen this ticket before replying.");
        }
        SupportStatus previous = ticket.getStatus();
        if (ticket.getAssignedTo() == null) {
            ticket.setAssignedTo(managedAdmin);
        }
        if (ticket.getStatus() == SupportStatus.OPEN || ticket.getStatus() == SupportStatus.WAITING_FOR_USER) {
            ticket.setStatus(SupportStatus.IN_PROGRESS);
        }
        SupportMessage message = saveMessage(ticket, managedAdmin, SupportMessageRole.ADMIN, trimToNull(request.message()), false);
        saveAttachments(ticket, message, managedAdmin, files);
        recordHistory(ticket, previous, ticket.getStatus(), managedAdmin, "Admin replied.");
        return toDetail(ticket, managedAdmin, true);
    }

    private SupportTicketPageResponse toPage(List<SupportTicket> tickets, int page, int size, boolean adminView) {
        int fromIndex = Math.min(page * size, tickets.size());
        int toIndex = Math.min(fromIndex + size, tickets.size());
        List<SupportTicket> content = tickets.subList(fromIndex, toIndex);
        int totalPages = tickets.isEmpty() ? 0 : (int) Math.ceil((double) tickets.size() / size);
        return new SupportTicketPageResponse(
                content.stream().map(ticket -> toListResponse(ticket, adminView)).toList(),
                page,
                size,
                tickets.size(),
                totalPages,
                page <= 0,
                page >= Math.max(totalPages - 1, 0)
        );
    }

    private List<SupportTicket> sortTickets(List<SupportTicket> tickets) {
        return sortTickets(tickets, "updatedAt,desc");
    }

    private List<SupportTicket> sortTickets(List<SupportTicket> tickets, String sort) {
        boolean created = sort != null && sort.toLowerCase(Locale.ROOT).startsWith("created");
        boolean ascending = sort != null && sort.toLowerCase(Locale.ROOT).endsWith("asc");
        Comparator<SupportTicket> comparator = (left, right) -> compareNullableDate(
                created ? left.getCreatedAt() : left.getUpdatedAt(),
                created ? right.getCreatedAt() : right.getUpdatedAt(),
                ascending);
        return tickets.stream()
                .sorted(comparator.thenComparing((left, right) -> compareNullableLong(left.getId(), right.getId(), ascending)))
                .toList();
    }

    private int compareNullableDate(LocalDateTime left, LocalDateTime right, boolean ascending) {
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        int result = left.compareTo(right);
        return ascending ? result : -result;
    }

    private int compareNullableLong(Long left, Long right, boolean ascending) {
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        int result = left.compareTo(right);
        return ascending ? result : -result;
    }

    private SupportTicketResponse toListResponse(SupportTicket ticket, boolean adminView) {
        long messageCount = messageRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).size();
        long attachmentCount = attachmentRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).size();
        User assignedTo = ticket.getAssignedTo();
        return new SupportTicketResponse(
                ticket.getId(),
                ticket.getTicketNumber(),
                ticket.getUser().getId(),
                ticket.getUser().getName(),
                ticket.getUser().getEmail(),
                ticket.getSubject(),
                ticket.getCategory(),
                ticket.getMessage(),
                ticket.getBookingId(),
                ticket.getTransactionId(),
                ticket.getStatus().name(),
                ticket.getPriority().name(),
                assignedTo == null ? null : assignedTo.getName(),
                assignedTo == null ? null : assignedTo.getEmail(),
                messageCount,
                attachmentCount,
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getClosedAt()
        );
    }

    private SupportTicketDetailResponse toDetail(SupportTicket ticket, User viewer, boolean adminView) {
        List<SupportMessageResponse> messages = messageRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).stream()
                .map(this::toMessageResponse)
                .toList();
        List<SupportAttachmentResponse> attachments = attachmentRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).stream()
                .map(this::toAttachmentResponse)
                .toList();
        List<SupportStatusHistoryResponse> history = historyRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).stream()
                .map(this::toHistoryResponse)
                .toList();
        User assignedTo = ticket.getAssignedTo();
        List<SupportInternalNoteResponse> noteResponses = new ArrayList<>();
        if (adminView && trimToNull(ticket.getLegacyInternalNotes()) != null) {
            noteResponses.add(new SupportInternalNoteResponse(-ticket.getId(), null, "Legacy note", ticket.getLegacyInternalNotes(), ticket.getCreatedAt()));
        }
        if (adminView) internalNoteRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).stream()
                .map(note -> new SupportInternalNoteResponse(note.getId(), note.getAdmin().getId(), note.getAdmin().getName(), note.getNote(), note.getCreatedAt()))
                .forEach(noteResponses::add);
        return new SupportTicketDetailResponse(
                ticket.getId(),
                ticket.getTicketNumber(),
                ticket.getUser().getId(),
                ticket.getUser().getName(),
                ticket.getUser().getEmail(),
                ticket.getSubject(),
                ticket.getCategory(),
                ticket.getMessage(),
                ticket.getBookingId(),
                ticket.getTransactionId(),
                ticket.getStatus().name(),
                ticket.getPriority().name(),
                assignedTo == null ? null : assignedTo.getName(),
                assignedTo == null ? null : assignedTo.getEmail(),
                assignedTo == null ? null : assignedTo.getId(),
                ticket.getAssignedAt(),
                ticket.getResolutionSummary(),
                ticket.getResolutionNotes(),
                ticket.getResolvedAt(),
                ticket.getResolvedBy() == null ? null : ticket.getResolvedBy().getName(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getClosedAt(),
                ticket.getClosedBy() == null ? null : ticket.getClosedBy().getName(),
                messages,
                attachments,
                history,
                noteResponses,
                Set.of(SupportStatus.OPEN, SupportStatus.IN_PROGRESS, SupportStatus.WAITING_FOR_USER).contains(ticket.getStatus()),
                ticket.getStatus() == SupportStatus.RESOLVED,
                ticket.getStatus() == SupportStatus.RESOLVED && ticket.getResolvedAt() != null
                        && !ticket.getResolvedAt().plusDays(7).isBefore(LocalDateTime.now())
        );
    }

    private SupportMessageResponse toMessageResponse(SupportMessage message) {
        return new SupportMessageResponse(
                message.getId(),
                message.getSenderName(),
                message.getSenderRole().name(),
                message.getMessage(),
                message.getCreatedAt(),
                attachmentRepository.findByMessageIdOrderByCreatedAtAsc(message.getId()).stream()
                        .map(this::toAttachmentResponse)
                        .toList()
        );
    }

    private SupportAttachmentResponse toAttachmentResponse(SupportAttachment attachment) {
        return new SupportAttachmentResponse(
                attachment.getId(),
                attachment.getOriginalFileName(),
                attachment.getFileUrl(),
                attachment.getContentType(),
                attachment.getFileSize(),
                attachment.getCreatedAt()
        );
    }

    private SupportStatusHistoryResponse toHistoryResponse(SupportStatusHistory history) {
        User changedBy = history.getChangedBy();
        return new SupportStatusHistoryResponse(
                history.getId(),
                history.getPreviousStatus(),
                history.getNewStatus(),
                changedBy == null ? "System" : changedBy.getName(),
                changedBy == null ? "SYSTEM" : changedBy.getRole().name(),
                history.getNote(),
                history.getCreatedAt()
        );
    }

    private SupportMessage saveMessage(SupportTicket ticket, User sender, SupportMessageRole role, String text, boolean internal) {
        SupportMessage message = SupportMessage.builder()
                .ticket(ticket)
                .sender(sender)
                .senderName(sender == null ? "System" : sender.getName())
                .senderRole(role)
                .message(text)
                .internal(internal)
                .build();
        return messageRepository.save(message);
    }

    private void saveAttachments(SupportTicket ticket, SupportMessage message, User uploader, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return;
        }
        Path uploadDir = resolveUploadRoot().resolve("support").resolve(ticket.getTicketNumber() == null ? "draft" : ticket.getTicketNumber());
        try {
            Files.createDirectories(uploadDir);
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                validateAttachment(file);
                String extension = getExtension(file.getOriginalFilename());
                String originalFileName = Paths.get(Optional.ofNullable(file.getOriginalFilename()).orElse("attachment"))
                        .getFileName().toString().replaceAll("[^A-Za-z0-9._ -]", "_");
                String storedFileName = UUID.randomUUID() + extension;
                Path target = uploadDir.resolve(storedFileName);
                Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
                attachmentRepository.save(SupportAttachment.builder()
                        .ticket(ticket)
                        .message(message)
                        .uploadedBy(uploader)
                        .originalFileName(originalFileName)
                        .storedFileName(storedFileName)
                        .fileUrl("/uploads/support/" + ticket.getTicketNumber() + "/" + storedFileName)
                        .contentType(file.getContentType())
                        .fileSize(file.getSize())
                        .build());
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store support attachment.");
        }
    }

    private void recordHistory(SupportTicket ticket, SupportStatus previous, SupportStatus next, User changedBy, String note) {
        historyRepository.save(SupportStatusHistory.builder()
                .ticket(ticket)
                .previousStatus(previous == null ? null : previous.name())
                .newStatus(next.name())
                .changedBy(changedBy)
                .note(note)
                .build());
    }

    private void transitionStatus(SupportTicket ticket, SupportStatus target) {
        SupportStatus current = ticket.getStatus();
        if (current == target) {
            return;
        }
        if (!isValidTransition(current, target)) {
            throw new IllegalArgumentException("Invalid support status transition from " + current + " to " + target + ".");
        }
        ticket.setStatus(target);
        if (target == SupportStatus.CLOSED) {
            ticket.setClosedAt(LocalDateTime.now());
        }
        if (target == SupportStatus.RESOLVED) {
            ticket.setClosedAt(null);
        }
    }

    private boolean isValidTransition(SupportStatus current, SupportStatus target) {
        return switch (current) {
            case OPEN -> target == SupportStatus.IN_PROGRESS || target == SupportStatus.WAITING_FOR_USER || target == SupportStatus.RESOLVED;
            case IN_PROGRESS -> target == SupportStatus.WAITING_FOR_USER || target == SupportStatus.RESOLVED;
            case WAITING_FOR_USER -> target == SupportStatus.IN_PROGRESS || target == SupportStatus.RESOLVED;
            case RESOLVED -> target == SupportStatus.CLOSED || target == SupportStatus.IN_PROGRESS;
            case CLOSED -> target == SupportStatus.IN_PROGRESS;
            case CANCELLED -> false;
        };
    }

    private SupportTicket requireTicket(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Support ticket not found."));
    }

    private void assign(SupportTicket ticket, Long assigneeId, User actor) {
        User previous = ticket.getAssignedTo();
        User assignee = null;
        if (assigneeId != null) {
            assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new IllegalArgumentException("Assigned admin not found."));
            if (assignee.getRole() != Role.ADMIN || assignee.isArchived()) {
                throw new IllegalArgumentException("Assignee must be an active admin.");
            }
        }
        if (!Objects.equals(previous == null ? null : previous.getId(), assignee == null ? null : assignee.getId())) {
            ticket.setAssignedTo(assignee);
            ticket.setAssignedAt(assignee == null ? null : LocalDateTime.now());
            recordHistory(ticket, ticket.getStatus(), ticket.getStatus(), actor,
                    assignee == null ? "Ticket unassigned." : "Ticket assigned to " + assignee.getName() + ".");
        }
    }

    private void addInternalNote(SupportTicket ticket, User admin, String text) {
        String note = trimToNull(text);
        if (note == null) return;
        internalNoteRepository.save(SupportInternalNote.builder().ticket(ticket).admin(admin).note(note).build());
        recordHistory(ticket, ticket.getStatus(), ticket.getStatus(), admin, "Internal note added.");
    }

    private SupportTicketDetailResponse reopen(SupportTicket ticket, User actor, boolean adminView) {
        SupportStatus previous = ticket.getStatus();
        transitionStatus(ticket, SupportStatus.IN_PROGRESS);
        ticket.setClosedAt(null);
        ticket.setClosedBy(null);
        ticketRepository.save(ticket);
        recordHistory(ticket, previous, SupportStatus.IN_PROGRESS, actor, "Ticket reopened.");
        return toDetail(ticket, actor, adminView);
    }

    private Specification<SupportTicket> userSpecification(Long userId, String query, String status) {
        return (root, cq, cb) -> {
            cq.distinct(true);
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(cb.upper(root.get("status").as(String.class)), status.toUpperCase(Locale.ROOT)));
            }
            addSearchPredicates(root, cb, predicates, query);
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    private Specification<SupportTicket> adminSpecification(String query, String status, String category, String priority,
                                                             Long assignedToId, LocalDate fromDate, LocalDate toDate) {
        return (root, cq, cb) -> {
            cq.distinct(true);
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(cb.upper(root.get("status").as(String.class)), status.toUpperCase(Locale.ROOT)));
            }
            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
                predicates.add(cb.equal(cb.upper(root.get("category")), category.toUpperCase(Locale.ROOT)));
            }
            if (priority != null && !priority.isBlank() && !"ALL".equalsIgnoreCase(priority)) {
                predicates.add(cb.equal(cb.upper(root.get("priority").as(String.class)), priority.toUpperCase(Locale.ROOT)));
            }
            if (assignedToId != null && assignedToId == -1L) predicates.add(cb.isNull(root.get("assignedTo")));
            else if (assignedToId != null) predicates.add(cb.equal(root.get("assignedTo").get("id"), assignedToId));
            if (fromDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate.atStartOfDay()));
            if (toDate != null) predicates.add(cb.lessThan(root.get("createdAt"), toDate.plusDays(1).atStartOfDay()));
            addSearchPredicates(root, cb, predicates, query);
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    private void addSearchPredicates(jakarta.persistence.criteria.Root<SupportTicket> root,
                                     jakarta.persistence.criteria.CriteriaBuilder cb,
                                     List<jakarta.persistence.criteria.Predicate> predicates,
                                     String query) {
        String text = trimToNull(query);
        if (text == null) {
            return;
        }
        String like = "%" + text.toLowerCase(Locale.ROOT) + "%";
        var userJoin = root.join("user", jakarta.persistence.criteria.JoinType.LEFT);
        predicates.add(cb.or(
                cb.like(cb.lower(root.get("ticketNumber")), like),
                cb.like(cb.lower(root.get("subject")), like),
                cb.like(cb.lower(root.get("category")), like),
                cb.like(cb.lower(root.get("bookingId")), like),
                cb.like(cb.lower(root.get("transactionId")), like),
                cb.like(cb.lower(userJoin.get("name")), like),
                cb.like(cb.lower(userJoin.get("email")), like)
        ));
    }

    private User requireAdminUser(User user) {
        User managedUser = requireManagedUser(user);
        if (managedUser.getRole() != Role.ADMIN) {
            throw new IllegalStateException("Only admin accounts can access support administration.");
        }
        return managedUser;
    }

    private User requireManagedUser(User user) {
        if (user == null) {
            throw new IllegalStateException("User account not found.");
        }
        return userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User account not found."));
    }

    private String normalizeCategory(String category) {
        String value = trimToNull(category);
        if (value == null) {
            throw new IllegalArgumentException("Category is required.");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
        if (!VALID_CATEGORIES.contains(normalized)) {
            throw new IllegalArgumentException("Selected support category is invalid.");
        }
        return normalized;
    }

    private SupportPriority parsePriority(String priority) {
        try {
            return SupportPriority.valueOf(priority.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid priority value.");
        }
    }

    private SupportStatus parseStatus(String status) {
        try {
            return SupportStatus.valueOf(status.trim().toUpperCase(Locale.ROOT).replace(' ', '_'));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid status value.");
        }
    }

    private String formatTicketNumber(Long id) {
        return String.format("SUP-%06d", id);
    }

    private Path resolveUploadRoot() {
        Path workingDirectory = Paths.get("").toAbsolutePath().normalize();
        return "backend".equalsIgnoreCase(String.valueOf(workingDirectory.getFileName()))
                ? workingDirectory.resolve("uploads")
                : workingDirectory.resolve("backend").resolve("uploads");
    }

    private void validateAttachment(MultipartFile file) {
        if (file.getSize() > MAX_ATTACHMENT_SIZE) {
            throw new IllegalArgumentException("Attachment must be 5 MB or smaller.");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_CONTENT_TYPES.contains(contentType) || !ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Only JPG, JPEG, PNG, and PDF attachments are allowed.");
        }
    }

    private String getExtension(String fileName) {
        if (!StringUtils.hasText(fileName) || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.')).toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private int clampPageSize(int size) {
        return Math.min(Math.max(size, 1), 100);
    }
}
