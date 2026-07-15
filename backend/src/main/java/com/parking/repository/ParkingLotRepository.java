package com.parking.repository;

import com.parking.model.ParkingLot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, Long> {
    List<ParkingLot> findByActiveTrueOrderByCreatedAtDesc();

    boolean existsByNameIgnoreCaseAndLocationIgnoreCase(String name, String location);

    boolean existsByNameIgnoreCaseAndLocationIgnoreCaseAndIdNot(String name, String location, Long id);
}
