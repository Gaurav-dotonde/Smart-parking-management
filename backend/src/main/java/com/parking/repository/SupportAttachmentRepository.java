package com.parking.repository;

import com.parking.model.SupportAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportAttachmentRepository extends JpaRepository<SupportAttachment, Long> {
    List<SupportAttachment> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
    List<SupportAttachment> findByMessageIdOrderByCreatedAtAsc(Long messageId);
}
