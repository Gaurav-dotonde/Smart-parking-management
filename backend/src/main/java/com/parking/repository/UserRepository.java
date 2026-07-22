package com.parking.repository;

import com.parking.model.User;
import com.parking.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findAllByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    boolean existsByRole(Role role);
    long countByRole(Role role);
    List<User> findAllByOrderByCreatedAtDesc();
    List<User> findAllByArchivedFalseOrderByCreatedAtDesc();
    List<User> findAllByRoleAndArchivedFalseOrderByCreatedAtDesc(Role role);
    long countByRoleAndArchivedFalse(Role role);
}
