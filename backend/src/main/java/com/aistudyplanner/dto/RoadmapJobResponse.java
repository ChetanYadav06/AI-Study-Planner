package com.aistudyplanner.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class RoadmapJobResponse {

    public enum State {
        QUEUED,
        RUNNING,
        DONE,
        FAILED
    }

    private String jobId;
    private State state;
    private int phasesDone;
    private int phasesTotal;
    private String message;
    private RoadmapResponse result;
    private String errorCode;

    public RoadmapJobResponse() {
    }

    public RoadmapJobResponse(String jobId, State state, int phasesDone, int phasesTotal, String message, RoadmapResponse result, String errorCode) {
        this.jobId = jobId;
        this.state = state;
        this.phasesDone = phasesDone;
        this.phasesTotal = phasesTotal;
        this.message = message;
        this.result = result;
        this.errorCode = errorCode;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public State getState() {
        return state;
    }

    public void setState(State state) {
        this.state = state;
    }

    public int getPhasesDone() {
        return phasesDone;
    }

    public void setPhasesDone(int phasesDone) {
        this.phasesDone = phasesDone;
    }

    public int getPhasesTotal() {
        return phasesTotal;
    }

    public void setPhasesTotal(int phasesTotal) {
        this.phasesTotal = phasesTotal;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public RoadmapResponse getResult() {
        return result;
    }

    public void setResult(RoadmapResponse result) {
        this.result = result;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }
}
