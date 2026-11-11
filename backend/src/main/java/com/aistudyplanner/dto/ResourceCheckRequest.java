package com.aistudyplanner.dto;

import java.util.List;

public class ResourceCheckRequest {
    private List<String> urls;

    public ResourceCheckRequest() {}

    public ResourceCheckRequest(List<String> urls) {
        this.urls = urls;
    }

    public List<String> getUrls() {
        return urls;
    }

    public void setUrls(List<String> urls) {
        this.urls = urls;
    }
}

