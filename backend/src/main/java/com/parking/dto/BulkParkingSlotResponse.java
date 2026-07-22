package com.parking.dto;

import java.util.List;

public record BulkParkingSlotResponse(int created, int skipped, int failed, List<String> skippedSlotNumbers) {}
