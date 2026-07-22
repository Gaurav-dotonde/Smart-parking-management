package com.parking.dto;

import java.util.Map;

public record FloorSlotMigrationResponse(Long parkingLotId, String parkingLotName,
        int recordsBefore, int recordsUpdated, int recordsAfter,
        boolean uniqueConstraintPresent, Map<String, Integer> floorCounts) { }
