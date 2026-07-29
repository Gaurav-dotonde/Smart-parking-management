package com.parking.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "support_tickets",
        indexes = {
                @Index(name = "idx_support_ticket_number", columnList = "ticket_number"),
                @Index(name = "idx_support_ticket_user", columnList = "user_id"),
                @Index(name = "idx_support_ticket_status", columnList = "status"),
                @Index(name = "idx_support_ticket_priority", columnList = "priority")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SupportTicket {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "ticket_number", unique = true, length = 20) private String ticketNumber;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, length = 80) private String subject;
    @Column(nullable = false, length = 30) private String category;
    @Column(name = "booking_id", length = 50) private String bookingId;
    @Column(name = "transaction_id", length = 80) private String transactionId;
    @Column(nullable = false, length = 4000) private String message;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) @Builder.Default private SupportStatus status = SupportStatus.OPEN;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) @Builder.Default private SupportPriority priority = SupportPriority.MEDIUM;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assigned_to_id") private User assignedTo;
    @Column(name = "internal_notes", length = 4000) private String internalNotes;
    @Column(nullable = false, updatable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;
    @PreUpdate void updateTime() { updatedAt = LocalDateTime.now(); }
}
