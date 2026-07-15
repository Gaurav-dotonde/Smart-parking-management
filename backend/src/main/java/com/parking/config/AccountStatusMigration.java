package com.parking.config;

import com.parking.model.AccountStatus;
import com.parking.model.User;
import com.parking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class AccountStatusMigration implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) {
        for (User user : userRepository.findAll()) {
            if (user.getAccountStatus() == null) {
                user.setAccountStatus(AccountStatus.ACTIVE);
                userRepository.save(user);
            }
        }
    }
}
