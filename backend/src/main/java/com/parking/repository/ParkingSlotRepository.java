package com.parking.repository;

import com.parking.model.ParkingSlot;
import com.parking.model.SlotStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<ParkingSlot> {

    List<ParkingSlot> findByParkingLotId(Long lotId);
    List<ParkingSlot> findByArchivedFalseOrderByUpdatedAtDesc();
    List<ParkingSlot> findByParkingLotIdAndArchivedFalse(Long lotId);
    List<ParkingSlot> findByParkingLotIdAndArchivedFalseOrderByFloorDescSlotNumberDesc(Long lotId);

    long countByParkingLotId(Long lotId);
    long countByParkingLotIdAndArchivedFalse(Long lotId);

    long countByParkingLotIdAndArchivedFalseAndStatus(Long lotId, SlotStatus status);

    boolean existsByParkingLotIdAndSlotNumberIgnoreCase(Long lotId, String slotNumber);

    boolean existsByParkingLotIdAndSlotNumberIgnoreCaseAndIdNot(Long lotId, String slotNumber, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ParkingSlot s where s.id = :id")
    Optional<ParkingSlot> findByIdForUpdate(@Param("id") Long id);

    @Query("""
        SELECT s.floor, s.status, COUNT(s)
        FROM ParkingSlot s
        WHERE s.parkingLot.id = :lotId AND s.archived = false
        GROUP BY s.floor, s.status
        """)
    List<Object[]> countByFloorAndStatus(@Param("lotId") Long lotId);

    @Query("""
        SELECT s.floor, s.status, COUNT(s) FROM ParkingSlot s
        WHERE s.archived = false GROUP BY s.floor, s.status
        """)
    List<Object[]> countAllByFloorAndStatus();

    default Specification<ParkingSlot> hasLotId(Long lotId) {
        return (root, query, cb) -> cb.equal(root.get("parkingLot").get("id"), lotId);
    }

    default Specification<ParkingSlot> isNotArchived() {
        return (root, query, cb) -> cb.equal(root.get("archived"), false);
    }

    default Specification<ParkingSlot> slotNumberContainsIgnoreCase(String search) {
        if (search == null || search.isBlank()) return null;
        String term = "%" + search.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("slotNumber")), term);
    }

    default Specification<ParkingSlot> hasFloor(Integer floor) {
        if (floor == null) return null;
        return (root, query, cb) -> cb.equal(root.get("floor"), floor);
    }

    default Specification<ParkingSlot> zoneContainsIgnoreCase(String zone) {
        if (zone == null || zone.isBlank()) return null;
        String term = "%" + zone.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("zone")), term);
    }

    default Specification<ParkingSlot> hasVehicleType(String vehicleType) {
        if (vehicleType == null || vehicleType.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("vehicleType"), vehicleType);
    }

    default Specification<ParkingSlot> hasSlotType(String slotType) {
        if (slotType == null || slotType.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("slotType"), slotType);
    }

    default Specification<ParkingSlot> hasStatus(SlotStatus status) {
        if (status == null) return null;
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }
}
