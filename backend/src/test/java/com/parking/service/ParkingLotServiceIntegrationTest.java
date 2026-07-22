package com.parking.service;

import com.parking.dto.ParkingLotRequest;
import com.parking.model.ParkingLot;
import com.parking.model.SlotStatus;
import com.parking.repository.ParkingSlotRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Transactional
class ParkingLotServiceIntegrationTest {

    @Autowired
    private ParkingLotService parkingLotService;

    @Autowired
    private ParkingSlotRepository parkingSlotRepository;

    @Test
    void createsLocationAndAutomaticallyGeneratesDynamicFloorsAndSlots() {
        ParkingLotRequest lotRequest = lotRequest();
        ParkingLot lot = parkingLotService.createLot(lotRequest);

        assertEquals(120, parkingLotService.getSlotsByLot(lot.getId()).size());
        assertEquals(120, parkingSlotRepository.countByParkingLotId(lot.getId()));
        assertEquals(5, lot.getTotalFloors());
        assertEquals(120, lot.getAvailableSlots());
    }

    @Test
    void increasesCapacityWithoutRecreatingExistingSlots() {
        ParkingLot lot = parkingLotService.createLot(lotRequest());
        var firstSlotId = parkingSlotRepository.findByParkingLotIdAndArchivedFalse(lot.getId()).get(0).getId();

        ParkingLotRequest update = new ParkingLotRequest();
        update.setTotalSlots(157);
        ParkingLot updated = parkingLotService.updateLot(lot.getId(), update);

        assertEquals(157, updated.getTotalSlots());
        assertEquals(7, updated.getTotalFloors());
        assertEquals(157, parkingSlotRepository.countByParkingLotId(lot.getId()));
        assertEquals(firstSlotId, parkingSlotRepository.findByParkingLotIdAndArchivedFalse(lot.getId()).get(0).getId());
    }

    @Test
    void decreasesCapacityOnlyWhenSurplusSlotsAreAvailable() {
        ParkingLot lot = parkingLotService.createLot(lotRequest());
        ParkingLotRequest decrease = new ParkingLotRequest();
        decrease.setTotalSlots(83);
        ParkingLot updated = parkingLotService.updateLot(lot.getId(), decrease);
        assertEquals(83, updated.getTotalSlots());
        assertEquals(4, updated.getTotalFloors());

        var last = parkingSlotRepository.findByParkingLotIdAndArchivedFalseOrderByFloorDescSlotNumberDesc(lot.getId()).get(0);
        last.setStatus(SlotStatus.BOOKED);
        parkingSlotRepository.save(last);
        ParkingLotRequest blockedDecrease = new ParkingLotRequest();
        blockedDecrease.setTotalSlots(82);
        assertThrows(IllegalStateException.class, () -> parkingLotService.updateLot(lot.getId(), blockedDecrease));
    }

    @Test
    void loadsCombinedSlotSummaryAndPagedSlots() {
        assertNotNull(parkingLotService.getAllSlotSummary());
        assertNotNull(parkingLotService.getAllAdminSlotsPaged(
                org.springframework.data.domain.PageRequest.of(0, 25), null));
    }

    private ParkingLotRequest lotRequest() {
        ParkingLotRequest request = new ParkingLotRequest();
        request.setName("Integration Lot " + UUID.randomUUID());
        request.setLocation("Transactional test address");
        request.setAddress("Transactional test address");
        request.setCity("Test City");
        request.setTotalSlots(120);
        request.setPricePerDay(25.0);
        request.setOpeningTime(LocalTime.of(6, 0));
        request.setClosingTime(LocalTime.of(22, 0));
        request.setActive(true);
        return request;
    }
}
