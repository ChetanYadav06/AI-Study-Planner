package com.aistudyplanner.dto;

import java.util.List;

public class ResourceWithCheckDto {
    private String title;
    private String url;
    private String type;
    private String relevance;
    private String sourceRoadmap;
    private boolean reachable;
    private Integer statusCode;
    private String checkedAt;

    public ResourceWithCheckDto() {}

    public ResourceWithCheckDto(String title, String url, String type, String relevance, String sourceRoadmap,
                                boolean reachable, Integer statusCode, String checkedAt) {
        this.title = title;
        this.url = url;
        this.type = type;
        this.relevance = relevance;
        this.sourceRoadmap = sourceRoadmap;
        this.reachable = reachable;
        this.statusCode = statusCode;
        this.checkedAt = checkedAt;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getRelevance() {
        return relevance;
    }

    public void setRelevance(String relevance) {
        this.relevance = relevance;
    }

    public String getSourceRoadmap() {
        return sourceRoadmap;
    }

    public void setSourceRoadmap(String sourceRoadmap) {
        this.sourceRoadmap = sourceRoadmap;
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

    public String getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(String checkedAt) {
        this.checkedAt = checkedAt;
    }
}

