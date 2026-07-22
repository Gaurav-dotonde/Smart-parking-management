package com.parking.model;

/** Capacity-driven floor and slot naming helpers. */
public final class ParkingFloor {
    public static final int DEFAULT_SLOTS_PER_FLOOR = 25;

    private static final String[] ORDINALS = {
            "Ground", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh",
            "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth",
            "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth"
    };

    private ParkingFloor() { }

    public static int floorCount(int capacity) {
        return capacity <= 0 ? 0 : (capacity + DEFAULT_SLOTS_PER_FLOOR - 1) / DEFAULT_SLOTS_PER_FLOOR;
    }

    public static String nameOf(int floor) {
        if (floor < 0) throw new IllegalArgumentException("Floor cannot be negative.");
        return (floor < ORDINALS.length ? ORDINALS[floor] : "Floor " + floor) + " Floor";
    }

    public static String zoneOf(int floor) {
        if (floor < 0) throw new IllegalArgumentException("Floor cannot be negative.");
        return floor == 0 ? "G" : "F" + floor;
    }

    public static String generatedSlotNumber(int sequence) {
        if (sequence < 1) throw new IllegalArgumentException("Slot sequence must be positive.");
        return String.format("P%05d", sequence);
    }
}
