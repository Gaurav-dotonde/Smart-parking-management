package com.parking.repository;
import com.parking.model.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
}
