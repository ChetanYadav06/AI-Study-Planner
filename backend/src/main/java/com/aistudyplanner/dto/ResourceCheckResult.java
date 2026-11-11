package com.aistudyplanner.dto;

import java.time.LocalDateTime;

public class ResourceCheckResult {
    private String url;
    private boolean reachable;
    private Integer statusCode;
    private String errorMessage;
    private LocalDateTime checkedAt;

    public ResourceCheckResult() {}

    public ResourceCheckResult(String url, boolean reachable, Integer statusCode, String errorMessage, LocalDateTime checkedAt) {
        this.url = url;
        this.reachable = reachable;
        this.statusCode = statusCode;
        this.errorMessage = errorMessage;
        this.checkedAt = checkedAt;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public boolean isReachable() {
        return reachable;
    }

    public void setReachable(boolean reachable) {
        this.reachable = reachable;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(Integer statusCode) {
        this.statusCode = statusCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public LocalDateTime getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(LocalDateTime checkedAt) {
        this.checkedAt = checkedAt;
    }
}

