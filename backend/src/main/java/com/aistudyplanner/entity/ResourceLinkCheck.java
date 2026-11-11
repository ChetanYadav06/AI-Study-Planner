package com.aistudyplanner.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "resource_link_checks",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_resource_link_hash", columnNames = {"url_hash"})
    }
)
public class ResourceLinkCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "url_hash", nullable = false, length = 64)
    private String urlHash;

    @Column(name = "url", nullable = false, length = 2048)
    private String url;

    @Column(name = "status_code")
    private Integer statusCode;

    @Column(name = "reachable", nullable = false)
    private Boolean reachable = false;

    @Column(name = "error_message", length = 255)
    private String errorMessage;

    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt;

    public ResourceLinkCheck() {}

    public ResourceLinkCheck(String urlHash, String url, Integer statusCode, Boolean reachable, String errorMessage) {
        this.urlHash = urlHash;
        this.url = url;
        this.statusCode = statusCode;
        this.reachable = reachable != null && reachable;
        this.errorMessage = errorMessage;
        this.checkedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getUrlHash() {
        return urlHash;
    }

    public void setUrlHash(String urlHash) {
        this.urlHash = urlHash;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(Integer statusCode) {
        this.statusCode = statusCode;
    }

    public Boolean getReachable() {
        return reachable;
    }

    public void setReachable(Boolean reachable) {
        this.reachable = reachable;
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

