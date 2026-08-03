package com.parking.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Keeps databases created by older versions compatible with SupportTicket.
 * Hibernate's schema update does not reliably add every new nullable column
 * to an existing MySQL table, so listing tickets can otherwise fail at runtime.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SupportTicketSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!tableExists("support_tickets")) {
            return;
        }

        addColumnIfMissing("assigned_to_id", "BIGINT NULL");
        addColumnIfMissing("internal_notes", "VARCHAR(4000) NULL");
        addColumnIfMissing("assigned_at", "DATETIME NULL");
        addColumnIfMissing("resolution_summary", "VARCHAR(4000) NULL");
        addColumnIfMissing("resolution_notes", "TEXT NULL");
        addColumnIfMissing("resolved_at", "DATETIME NULL");
        addColumnIfMissing("resolved_by_id", "BIGINT NULL");
        addColumnIfMissing("updated_at", "DATETIME NULL");
        addColumnIfMissing("closed_at", "DATETIME NULL");
        addColumnIfMissing("closed_by_id", "BIGINT NULL");
        addColumnIfMissing("version", "BIGINT NULL");
    }

    private void addColumnIfMissing(String column, String definition) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'support_tickets'
                  AND column_name = ?
                """, Integer.class, column);
        if (count != null && count > 0) {
            return;
        }
        log.warn("Missing support_tickets.{} column detected. Applying schema fix.", column);
        jdbcTemplate.execute("ALTER TABLE support_tickets ADD COLUMN " + column + " " + definition);
    }

    private boolean tableExists(String table) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = ?
                """, Integer.class, table);
        return count != null && count > 0;
    }
}
