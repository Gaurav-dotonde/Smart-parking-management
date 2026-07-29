package com.parking.repository;

import com.parking.model.SupportStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportStatusHistoryRepository extends JpaRepository<SupportStatusHistory, Long> {
    List<SupportStatusHistory> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
}
