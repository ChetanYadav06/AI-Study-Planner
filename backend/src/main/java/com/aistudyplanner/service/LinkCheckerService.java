package com.aistudyplanner.service;

import com.aistudyplanner.dto.ResourceCheckResult;
import com.aistudyplanner.entity.ResourceLinkCheck;
import com.aistudyplanner.repository.ResourceLinkCheckRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.*;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service to validate external educational links with strict SSRF protections.
 *
 * DNS-REBINDING MITIGATION & REMAINING RISK DOCUMENTATION:
 * We resolve the hostname's IP addresses prior to opening the HTTP connection and verify
 * that no resolved IP is loopback, link-local, site-local, any-local, or matches Cloud Metadata IPs (169.254.169.254).
 * However, with Java's standard java.net.http.HttpClient, the HTTP request execution resolves DNS independently.
 * In environments without a custom socket factory or DNS pin, a Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding
 * window theoretically exists if an attacker controls a subverted domain whose TTL expires between pre-check
 * and HttpClient invocation. Because this service restricts links strictly to a curated allowlist of known domains
 * and trusted educational apexes, external DNS rebinding from attacker-controlled nameservers is effectively neutralized.
 */
@Service
public class LinkCheckerService {

    private static final Logger log = LoggerFactory.getLogger(LinkCheckerService.class);

    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "docs.spring.io",
            "spring.io",
            "react.dev",
            "legacy.reactjs.org",
            "developer.mozilla.org",
            "leetcode.com",
            "docs.oracle.com",
            "en.wikipedia.org",
            "github.com",
            "w3schools.com",
            "geeksforgeeks.org",
            "freecodecamp.org",
            "coursera.org",
            "edx.org",
            "khanacademy.org",
            "stackoverflow.com",
            "doc.rust-lang.org",
            "docs.docker.com",
            "kubernetes.io",
            "tensorflow.org",
            "postgresql.org"
    );

    private final ResourceLinkCheckRepository checkRepository;
    private final HttpClient httpClient;

    public LinkCheckerService(ResourceLinkCheckRepository checkRepository) {
        this.checkRepository = checkRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER) // manual redirect handling up to 3
                .build();
    }

    public static String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public boolean isAllowedHost(String host) {
        if (host == null || host.isBlank()) {
            return false;
        }
        String lowerHost = host.toLowerCase(Locale.ROOT);
        if (ALLOWED_HOSTS.contains(lowerHost)) {
            return true;
        }
        for (String allowed : ALLOWED_HOSTS) {
            if (lowerHost.endsWith("." + allowed)) {
                return true;
            }
        }
        return false;
    }

    public void validateSafeUrl(URI uri) {
        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("Only http and https protocols are allowed");
        }

        if (uri.getUserInfo() != null) {
            throw new IllegalArgumentException("Userinfo in URL is forbidden");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Invalid URL host");
        }

        if (!isAllowedHost(host)) {
            throw new IllegalArgumentException("Host is not in the trusted domain allowlist");
        }

        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress addr : addresses) {
                if (addr.isLoopbackAddress()
                        || addr.isLinkLocalAddress()
                        || addr.isSiteLocalAddress()
                        || addr.isAnyLocalAddress()
                        || addr.getHostAddress().equals("169.254.169.254")) {
                    throw new IllegalArgumentException("Host resolves to forbidden private or link-local address: " + addr.getHostAddress());
                }
            }
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("Unknown or unresolvable host: " + host);
        }
    }

    @Transactional
    public ResourceCheckResult checkSingleUrl(String url) {
        if (url == null || url.isBlank()) {
            return new ResourceCheckResult(url, false, null, "Empty URL", LocalDateTime.now());
        }

        String hash = computeSha256(url);
        Optional<ResourceLinkCheck> cached = checkRepository.findByUrlHash(hash);
        if (cached.isPresent()) {
            ResourceLinkCheck existing = cached.get();
            // 7-day cache
            if (existing.getCheckedAt() != null && existing.getCheckedAt().isAfter(LocalDateTime.now().minusDays(7))) {
                return new ResourceCheckResult(existing.getUrl(), existing.getReachable(), existing.getStatusCode(), existing.getErrorMessage(), existing.getCheckedAt());
            }
        }

        URI currentUri;
        try {
            currentUri = URI.create(url);
            validateSafeUrl(currentUri);
        } catch (Exception e) {
            log.warn("URL validation rejected for {}: {}", url, e.getMessage());
            ResourceLinkCheck record = cached.orElseGet(() -> new ResourceLinkCheck(hash, url, null, false, e.getMessage()));
            record.setReachable(false);
            record.setErrorMessage(e.getMessage());
            record.setCheckedAt(LocalDateTime.now());
            checkRepository.save(record);
            return new ResourceCheckResult(url, false, null, e.getMessage(), record.getCheckedAt());
        }

        // Perform HTTP check with manual redirect follow (max 3)
        int redirects = 0;
        int lastStatusCode = 0;
        boolean reachable = false;
        String errorMessage = null;

        while (redirects <= 3) {
            try {
                HttpRequest headRequest = HttpRequest.newBuilder(currentUri)
                        .timeout(Duration.ofSeconds(5))
                        .header("User-Agent", "AIStudyPlanner/1.0 (LinkValidator)")
                        .method("HEAD", HttpRequest.BodyPublishers.noBody())
                        .build();

                HttpResponse<Void> resp = httpClient.send(headRequest, HttpResponse.BodyHandlers.discarding());
                int code = resp.statusCode();
                lastStatusCode = code;

                // If HEAD returns 405 Method Not Allowed or 403 Forbidden, retry with GET
                if (code == 405 || code == 403) {
                    HttpRequest getRequest = HttpRequest.newBuilder(currentUri)
                            .timeout(Duration.ofSeconds(5))
                            .header("User-Agent", "AIStudyPlanner/1.0 (LinkValidator)")
                            .GET()
                            .build();
                    resp = httpClient.send(getRequest, HttpResponse.BodyHandlers.discarding());
                    code = resp.statusCode();
                    lastStatusCode = code;
                }

                if (code >= 200 && code < 300) {
                    reachable = true;
                    break;
                } else if (code >= 300 && code < 400) {
                    redirects++;
                    Optional<String> location = resp.headers().firstValue("Location");
                    if (location.isEmpty()) {
                        errorMessage = "Redirect without Location header";
                        break;
                    }
                    URI nextUri = currentUri.resolve(location.get());
                    validateSafeUrl(nextUri);
                    currentUri = nextUri;
                } else {
                    errorMessage = "HTTP status " + code;
                    break;
                }
            } catch (Exception e) {
                errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                break;
            }
        }

        ResourceLinkCheck record;
        if (cached.isPresent()) {
            record = cached.get();
        } else {
            record = new ResourceLinkCheck(hash, url, lastStatusCode > 0 ? lastStatusCode : null, reachable, errorMessage);
        }
        record.setStatusCode(lastStatusCode > 0 ? lastStatusCode : null);
        record.setReachable(reachable);
        record.setErrorMessage(errorMessage);
        record.setCheckedAt(LocalDateTime.now());
        checkRepository.save(record);

        return new ResourceCheckResult(url, reachable, record.getStatusCode(), errorMessage, record.getCheckedAt());
    }

    @Transactional
    public List<ResourceCheckResult> checkBatch(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return Collections.emptyList();
        }
        List<ResourceCheckResult> results = new ArrayList<>();
        int count = 0;
        for (String u : urls) {
            if (count >= 10) break; // max 10 URLs per call
            results.add(checkSingleUrl(u));
            count++;
        }
        return results;
    }
}
