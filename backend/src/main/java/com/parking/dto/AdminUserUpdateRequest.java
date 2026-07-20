package com.parking.dto;

import com.parking.model.AccountStatus;
import com.parking.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class AdminUserUpdateRequest {
    @NotBlank(message = "Full name cannot be empty.") private String name;
    @NotBlank(message = "Email address is required.") @Email(message = "Email must be in valid format.") private String email;
    @Pattern(regexp = "^$|^[0-9]{10}$", message = "Phone number must contain 10 digits.") private String phone;
    @Pattern(regexp = "^$|.{8,}", message = "Password must be at least 8 characters.") private String password;
    private Role role = Role.USER;
    private AccountStatus accountStatus = AccountStatus.ACTIVE;
}
