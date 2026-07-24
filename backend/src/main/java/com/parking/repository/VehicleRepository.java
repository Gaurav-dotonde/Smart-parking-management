package com.parking.repository;

import com.parking.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findAllByArchivedFalseOrderByCreatedAtDesc();
    List<Vehicle> findAllByArchivedTrueOrderByArchivedAtDesc();
    boolean existsByRegistrationNormalized(String registrationNormalized);
    boolean existsByRegistrationNormalizedAndIdNot(String registrationNormalized, Long id);
    long countByArchivedFalse();
    long countByArchivedFalseAndActiveTrue();
    Optional<Vehicle> findByRegistrationNormalized(String registrationNormalized);
    List<Vehicle> findByOwnerIdAndArchivedFalseOrderByCreatedAtDesc(Long ownerId);
    List<Vehicle> findByOwnerIdAndArchivedFalseAndActiveTrueOrderByCreatedAtDesc(Long ownerId);
}
