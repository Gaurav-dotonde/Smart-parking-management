package com.parking.config;

import com.parking.model.AccountStatus;
import com.parking.model.Role;
import com.parking.model.User;
import com.parking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Component
@Order(100)
@RequiredArgsConstructor
@Slf4j
public class DefaultAdminInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.default-admin.name:Parking Administrator}")
    private String name;
    @Value("${app.default-admin.email:admin@gmail.com}")
    private String email;
    @Value("${app.default-admin.password:Admin@123}")
    private String password;

    @Override
    @Transactional
    public void run(String... args) {
        String normalizedEmail = email.trim().toLowerCase();
        List<User> matchingAccounts = userRepository.findAllByEmailIgnoreCase(normalizedEmail);

        if (!matchingAccounts.isEmpty()) {
            User admin = selectAccountToKeep(matchingAccounts);
            matchingAccounts.stream()
                    .filter(account -> !account.getId().equals(admin.getId()))
                    .forEach(account -> userRepository.delete(
                            Objects.requireNonNull(account, "duplicate account must not be null")));

            admin.setEmail(normalizedEmail);
            admin.setRole(Role.ADMIN);
            admin.setAccountStatus(AccountStatus.ACTIVE);
            if (!isBcrypt(admin.getPassword())) {
                admin.setPassword(passwordEncoder.encode(password));
                log.warn("Re-encoded the legacy password for administrator {} with BCrypt.", normalizedEmail);
            }
            userRepository.save(Objects.requireNonNull(admin, "admin must not be null"));

            if (matchingAccounts.size() > 1) {
                log.warn("Removed {} duplicate account(s) for {}.", matchingAccounts.size() - 1, normalizedEmail);
            }
            return;
        }

        if (userRepository.existsByRole(Role.ADMIN)) {
            log.info("An administrator already exists; default administrator creation skipped.");
            return;
        }
        User admin = User.builder()
                .name(name.trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password))
                .role(Role.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        userRepository.save(Objects.requireNonNull(admin, "admin must not be null"));
        log.info("Default administrator created for {}. Change its password after first login.", admin.getEmail());
    }

    private User selectAccountToKeep(List<User> accounts) {
        return accounts.stream()
                .min(Comparator
                        .comparing((User user) -> !isBcrypt(user.getPassword()))
                        .thenComparing(user -> user.getRole() != Role.ADMIN)
                        .thenComparing(user -> user.getAccountStatus() != AccountStatus.ACTIVE)
                        .thenComparing(user -> Objects.requireNonNull(
                                user, "admin candidate must not be null").getId()))
                .orElseThrow();
    }

    private boolean isBcrypt(String storedPassword) {
        return storedPassword != null && storedPassword.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$");
    }
}
