package com.parking.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "support_internal_notes", indexes = @Index(name = "idx_support_note_ticket", columnList = "ticket_id,created_at"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SupportInternalNote {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "ticket_id", nullable = false) private SupportTicket ticket;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "admin_id", nullable = false) private User admin;
    @Column(nullable = false, length = 4000) private String note;
    @Column(name = "created_at", nullable = false, updatable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
