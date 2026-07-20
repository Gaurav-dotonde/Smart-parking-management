package com.parking.dto;

import com.parking.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminUserCreateRequest {
    @NotBlank(message = "Full name cannot be empty.") private String name;
    @NotBlank(message = "Email address is required.") @Email(message = "Email must be in valid format.") private String email;
    @Pattern(regexp = "^$|^[0-9]{10}$", message = "Phone number must contain 10 digits.") private String phone;
    @NotBlank(message = "Password is required.") @Size(min = 8, message = "Password must be at least 8 characters.") private String password;
    private Role role = Role.USER;
}
