package com.parking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportInternalNoteRequest(@NotBlank @Size(max = 4000) String note) {}
