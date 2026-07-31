package com.parking.repository;

import com.parking.model.SupportInternalNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SupportInternalNoteRepository extends JpaRepository<SupportInternalNote, Long> {
    List<SupportInternalNote> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
}
