package com.parking.repository;
import com.parking.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PaymentRepository extends JpaRepository<Payment,Long>{
 List<Payment> findAllByOrderByCreatedAtDesc();
 boolean existsByTransactionReference(String reference);
}
