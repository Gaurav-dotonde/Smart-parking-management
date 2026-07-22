package com.parking.config;

import com.parking.service.ParkingSlotLayoutMigrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Applies the capacity-driven floor layout to existing databases on application startup. */
@Order(200)
@Component
@RequiredArgsConstructor
@Slf4j
public class ParkingFloorLayoutMigration implements ApplicationRunner {
    private final ParkingSlotLayoutMigrationService layoutMigrationService;

    @Override
    public void run(ApplicationArguments args) {
        layoutMigrationService.migrateAll();
        log.info("Parking slots normalized to dynamic 25-slot floors for each location capacity.");
    }
}
