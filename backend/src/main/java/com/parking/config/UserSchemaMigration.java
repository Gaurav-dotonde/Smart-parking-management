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
public class UserSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!tableExists("users")) {
            log.info("Users table not found during startup migration. Hibernate will create it if needed.");
            return;
        }

        if (!columnExists("users", "created_at")) {
            log.warn("Missing users.created_at column detected. Applying safe schema fix.");
            jdbcTemplate.execute(
                    "ALTER TABLE users " +
                    "ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
            );
            log.info("Added users.created_at column successfully.");
        }

        jdbcTemplate.update(
                "UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"
        );

        addColumnIfMissing("users", "last_login", "DATETIME NULL");
        addColumnIfMissing("users", "profile_photo", "VARCHAR(500) NULL");
        addColumnIfMissing("parking_slots", "vehicle_type", "VARCHAR(50) NOT NULL DEFAULT 'Car'");
    }

    private void addColumnIfMissing(String tableName, String columnName, String definition) {
        if (columnExists(tableName, columnName)) {
            return;
        }

        log.warn("Missing {}.{} column detected. Applying safe schema fix.", tableName, columnName);
        jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
        log.info("Added {}.{} column successfully.", tableName, columnName);
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = ?
                """,
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = ?
                  AND column_name = ?
                """,
                Integer.class,
                tableName,
                columnName
        );
        return count != null && count > 0;
    }
}
