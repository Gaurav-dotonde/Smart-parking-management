package com.parking.repository;

import com.parking.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findAllByArchivedFalseOrderByCreatedAtDesc();
    boolean existsByRegistrationNormalized(String registrationNormalized);
    boolean existsByRegistrationNormalizedAndIdNot(String registrationNormalized, Long id);
    long countByArchivedFalse();
    Optional<Vehicle> findByRegistrationNormalized(String registrationNormalized);
}
