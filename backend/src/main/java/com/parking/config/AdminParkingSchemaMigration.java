package com.parking.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminParkingSchemaMigration implements ApplicationRunner {
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        ensureBookingStatusCompatibility();
        ensureBookingLifecycleColumns();
        ensureSlotStatusCompatibility();
        if (!tableExists("parking_slots")) return;
        Integer duplicates = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM (
                    SELECT lot_id, UPPER(TRIM(slot_number))
                    FROM parking_slots
                    GROUP BY lot_id, UPPER(TRIM(slot_number))
                    HAVING COUNT(*) > 1
                ) duplicate_slots
                """, Integer.class);
        if (duplicates != null && duplicates > 0) {
            throw new IllegalStateException("Cannot add parking-slot uniqueness constraint: duplicate slot numbers exist within a location.");
        }
        if (!indexExists("parking_slots", "uk_slot_lot_number")) {
            log.info("Adding database-level composite uniqueness for parking slot numbers.");
            jdbcTemplate.execute("ALTER TABLE parking_slots ADD CONSTRAINT uk_slot_lot_number UNIQUE (lot_id, slot_number)");
        }
        addIndex("parking_slots", "idx_parking_slots_lot_id", "lot_id");
        addIndex("parking_slots", "idx_parking_slots_status", "status");
        addIndex("parking_slots", "idx_parking_slots_floor", "floor");
        addIndex("parking_slots", "idx_parking_slots_vehicle_type", "vehicle_type");
        addIndex("parking_slots", "idx_parking_slots_slot_type", "slot_type");
        addIndex("parking_slots", "idx_parking_slots_lot_id_status", "lot_id, status");
        addIndex("parking_slots", "idx_parking_slots_lot_id_floor", "lot_id, floor");
        jdbcTemplate.update("UPDATE parking_lots SET address = location WHERE address IS NULL OR TRIM(address) = ''");
        jdbcTemplate.update("UPDATE parking_lots SET archived = FALSE WHERE archived IS NULL");
        jdbcTemplate.update("UPDATE parking_slots SET slot_type = 'STANDARD' WHERE slot_type IS NULL OR TRIM(slot_type) = ''");
        jdbcTemplate.update("UPDATE parking_slots SET archived = FALSE WHERE archived IS NULL");
        jdbcTemplate.update("UPDATE parking_slots SET ev_charging_available = FALSE WHERE ev_charging_available IS NULL");
        jdbcTemplate.update("UPDATE parking_slots SET accessible_slot = FALSE WHERE accessible_slot IS NULL");
        jdbcTemplate.update("UPDATE parking_slots SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
    }

    private void ensureBookingStatusCompatibility() {
        if (!tableExists("bookings")) return;
        String columnType = jdbcTemplate.queryForObject("""
                SELECT COLUMN_TYPE
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'bookings'
                  AND column_name = 'status'
                """, String.class);
        if (columnType != null && columnType.toLowerCase().startsWith("enum(")
                && !columnType.toUpperCase().contains("'OCCUPIED'")) {
            log.info("Expanding bookings.status values required by the existing admin booking lifecycle.");
            jdbcTemplate.execute("""
                    ALTER TABLE bookings MODIFY COLUMN status
                    ENUM(
                        'PENDING',
                        'APPROVED',
                        'RESERVED',
                        'ACTIVE',
                        'OCCUPIED',
                        'CANCELLED',
                        'COMPLETED',
                        'PENDING_PAYMENT',
                        'CONFIRMED',
                        'EXPIRED'
                    ) NOT NULL
                    """);
        }
    }

    private void ensureBookingLifecycleColumns() {
        if (!tableExists("bookings")) return;
        addColumn("bookings", "expired_at", "DATETIME NULL");
        addColumn("bookings", "completed_at", "DATETIME NULL");
        addColumn("bookings", "overstay", "BOOLEAN NOT NULL DEFAULT FALSE");
        addColumn("bookings", "extended", "BOOLEAN NOT NULL DEFAULT FALSE");
        addColumn("bookings", "extension_count", "INT NOT NULL DEFAULT 0");
        addColumn("bookings", "original_end_time", "DATETIME NULL");
        addColumn("bookings", "cancellation_reason", "VARCHAR(500) NULL");
        addIndex("bookings", "idx_bookings_slot_window", "slot_id, start_time, end_time");
        addIndex("bookings", "idx_bookings_status_start_end", "status, start_time, end_time");
    }

    private void ensureSlotStatusCompatibility() {
        if (!tableExists("parking_slots")) return;
        String columnType = jdbcTemplate.queryForObject("""
                SELECT COLUMN_TYPE FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'parking_slots' AND column_name = 'status'
                """, String.class);
        if (columnType != null && columnType.toLowerCase().startsWith("enum(")
                && !columnType.toUpperCase().contains("'INACTIVE'")) {
            jdbcTemplate.execute("""
                    ALTER TABLE parking_slots MODIFY COLUMN status
                    ENUM('AVAILABLE','RESERVED','OCCUPIED','MAINTENANCE','INACTIVE','BOOKED','DISABLED') NOT NULL
                    """);
        }
        jdbcTemplate.update("UPDATE parking_slots SET status = 'INACTIVE' WHERE status = 'DISABLED'");
    }

    private void addColumn(String table, String column, String definition) {
        if (columnExists(table, column)) return;
        log.info("Adding lifecycle column {}.{}.", table, column);
        jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
                """, Integer.class, table, column);
        return count != null && count > 0;
    }

    private void addIndex(String table, String indexName, String columns) {
        if (indexExists(table, indexName)) return;
        log.info("Adding index {} on {}({})", indexName, table, columns);
        jdbcTemplate.execute("ALTER TABLE " + table + " ADD INDEX " + indexName + " (" + columns + ")");
    }

    private boolean tableExists(String table) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", Integer.class, table);
        return count != null && count > 0;
    }

    private boolean indexExists(String table, String index) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?", Integer.class, table, index);
        return count != null && count > 0;
    }
}
