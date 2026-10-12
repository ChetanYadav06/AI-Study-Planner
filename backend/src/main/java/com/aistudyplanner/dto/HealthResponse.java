package com.aistudyplanner.dto;

import java.time.LocalDateTime;

public class HealthResponse {
    private String status;
    private String databaseStatus;
    private String databaseProductName;
    private String databaseVersion;
    private long responseTimeMs;
    private LocalDateTime timestamp;
    private String message;

    public HealthResponse() {
    }

    public HealthResponse(String status, String databaseStatus, String databaseProductName, 
                          String databaseVersion, long responseTimeMs, LocalDateTime timestamp, String message) {
        this.status = status;
        this.databaseStatus = databaseStatus;
        this.databaseProductName = databaseProductName;
        this.databaseVersion = databaseVersion;
        this.responseTimeMs = responseTimeMs;
        this.timestamp = timestamp;
        this.message = message;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDatabaseStatus() {
        return databaseStatus;
    }

    public void setDatabaseStatus(String databaseStatus) {
        this.databaseStatus = databaseStatus;
    }

    public String getDatabaseProductName() {
        return databaseProductName;
    }

    public void setDatabaseProductName(String databaseProductName) {
        this.databaseProductName = databaseProductName;
    }

    public String getDatabaseVersion() {
        return databaseVersion;
    }

    public void setDatabaseVersion(String databaseVersion) {
        this.databaseVersion = databaseVersion;
    }

    public long getResponseTimeMs() {
        return responseTimeMs;
    }

    public void setResponseTimeMs(long responseTimeMs) {
        this.responseTimeMs = responseTimeMs;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
