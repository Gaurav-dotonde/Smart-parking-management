package com.parking.repository;

import com.parking.model.ParkingSlot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {

    List<ParkingSlot> findByParkingLotId(Long lotId);

    long countByParkingLotId(Long lotId);

    boolean existsByParkingLotIdAndSlotNumberIgnoreCase(Long lotId, String slotNumber);

    boolean existsByParkingLotIdAndSlotNumberIgnoreCaseAndIdNot(Long lotId, String slotNumber, Long id);

    // Pessimistic write lock so two concurrent booking requests
    // for the SAME slot cannot both succeed (prevents race condition).
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ParkingSlot s where s.id = :id")
    Optional<ParkingSlot> findByIdForUpdate(@Param("id") Long id);
}
