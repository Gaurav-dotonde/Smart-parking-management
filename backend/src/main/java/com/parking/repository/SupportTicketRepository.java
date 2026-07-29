package com.parking.repository;

import com.parking.model.SupportStatus;
import com.parking.model.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long>, JpaSpecificationExecutor<SupportTicket> {
    Optional<SupportTicket> findByTicketNumber(String ticketNumber);
    Optional<SupportTicket> findByIdAndUserId(Long id, Long userId);
    Optional<SupportTicket> findByTicketNumberAndUserId(String ticketNumber, Long userId);
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<SupportTicket> findByUserIdOrderByUpdatedAtDesc(Long userId);
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
    long countByUserId(Long userId);
    long countByUserIdAndStatus(Long userId, SupportStatus status);
    long countByStatus(SupportStatus status);
    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
