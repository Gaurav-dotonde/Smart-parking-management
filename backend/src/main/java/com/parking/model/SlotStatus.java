package com.parking.model;

public enum SlotStatus {
    AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE, INACTIVE,
    // Legacy values retained so existing databases can be migrated safely.
    BOOKED, DISABLED
}
