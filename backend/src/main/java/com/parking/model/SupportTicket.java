package com.parking.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "support_tickets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SupportTicket {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false, length = 80) private String subject;
    @Column(nullable = false, length = 30) private String category;
    @Column(nullable = false, length = 1500) private String message;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "OPEN";
    @Column(length = 1500) private String adminReply;
    @Column(nullable = false, updatable = false) @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;
    @PreUpdate void updateTime() { updatedAt = LocalDateTime.now(); }
}
