package com.aistudyplanner.controller;

import com.aistudyplanner.dto.HealthResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<HealthResponse> getHealth() {
        long startTime = System.currentTimeMillis();
        String dbStatus = "DISCONNECTED";
        String dbProduct = "Unknown";
        String dbVersion = "Unknown";
        String message = "Backend is online.";

        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(2)) {
                dbStatus = "CONNECTED";
                DatabaseMetaData metaData = connection.getMetaData();
                dbProduct = metaData.getDatabaseProductName();
                dbVersion = metaData.getDatabaseProductVersion();
                message = "Backend and MySQL database are healthy and connected.";
            }
        } catch (Exception e) {
            dbStatus = "ERROR: " + e.getMessage();
            message = "Backend is running, but database connection failed: " + e.getMessage();
        }

        long responseTime = System.currentTimeMillis() - startTime;
        HealthResponse response = new HealthResponse(
                "UP",
                dbStatus,
                dbProduct,
                dbVersion,
                responseTime,
                LocalDateTime.now(),
                message
        );

        return ResponseEntity.ok(response);
    }
}
