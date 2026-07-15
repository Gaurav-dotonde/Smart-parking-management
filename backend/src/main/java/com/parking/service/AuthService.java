package com.parking.service;

import com.parking.dto.AuthResponse;
import com.parking.dto.LoginRequest;
import com.parking.dto.RegisterRequest;
import com.parking.model.AccountStatus;
import com.parking.model.Role;
import com.parking.model.User;
import com.parking.repository.UserRepository;
import com.parking.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AdminProfileService adminProfileService;

    public AuthResponse register(RegisterRequest request) {
        RegisterRequest safeRequest = Objects.requireNonNull(request, "request must not be null");
        if (userRepository.existsByEmail(safeRequest.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        if (!safeRequest.getPassword().equals(safeRequest.getConfirmPassword())) {
            throw new IllegalArgumentException("Password and confirm password do not match.");
        }

        User user = User.builder()
                .name(safeRequest.getName())
                .email(safeRequest.getEmail())
                .phone(safeRequest.getPhone())
                .password(passwordEncoder.encode(safeRequest.getPassword()))
                .role(Role.USER)
                .accountStatus(AccountStatus.ACTIVE)
                .vehicleNumber(safeRequest.getVehicleNumber())
                .build();

        userRepository.save(Objects.requireNonNull(user, "user must not be null"));

        return new AuthResponse(null, user.getId(), user.getName(), user.getEmail(), user.getRole().name(), user.getAccountStatus().name());
    }

    public AuthResponse login(LoginRequest request) {
        LoginRequest safeRequest = Objects.requireNonNull(request, "request must not be null");
        User user = userRepository.findByEmail(safeRequest.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        if (!passwordEncoder.matches(safeRequest.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        AccountStatus status = normalizeStatus(user);

        if (status == AccountStatus.BLOCKED) {
            throw new IllegalArgumentException("Your account has been blocked. Please contact the administrator.");
        }

        if (status != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("Your account is not active.");
        }

        adminProfileService.markSuccessfulLogin(user.getEmail());
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name(), status.name());
    }

    private AccountStatus normalizeStatus(User user) {
        if (user.getAccountStatus() == null) {
            user.setAccountStatus(AccountStatus.ACTIVE);
            userRepository.save(user);
            return AccountStatus.ACTIVE;
        }
        return user.getAccountStatus();
    }
}
