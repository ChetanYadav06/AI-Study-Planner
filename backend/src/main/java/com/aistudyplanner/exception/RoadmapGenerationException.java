package com.aistudyplanner.exception;

import org.springframework.http.HttpStatus;

public class RoadmapGenerationException extends RuntimeException {

    private final HttpStatus status;

    public RoadmapGenerationException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public RoadmapGenerationException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}

