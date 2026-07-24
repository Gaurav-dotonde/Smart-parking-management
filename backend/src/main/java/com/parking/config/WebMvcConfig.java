package com.parking.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path workingDirectory = Paths.get("").toAbsolutePath().normalize();
        Path uploadPath = "backend".equalsIgnoreCase(String.valueOf(workingDirectory.getFileName()))
                ? workingDirectory.resolve("uploads")
                : workingDirectory.resolve("backend").resolve("uploads");
        Path legacyUploadPath = Paths.get("backend", "uploads").toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath.toUri().toString(), legacyUploadPath.toUri().toString());
    }
}
