package com.aistudyplanner.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SlidingWindowRateLimiter {

    private final ConcurrentHashMap<String, Deque<Long>> requestLogs = new ConcurrentHashMap<>();

    /**
     * Attempts to acquire an execution permit within the sliding time window.
     *
     * @param key Unique client/action identifier (e.g. "email:roadmap" or "ip:linkcheck")
     * @param maxRequests Maximum allowed requests in the duration
     * @param windowSeconds Window length in seconds
     * @return true if allowed; false if rate limit exceeded
     */
    public synchronized boolean tryAcquire(String key, int maxRequests, long windowSeconds) {
        long now = Instant.now().getEpochSecond();
        long windowStart = now - windowSeconds;

        Deque<Long> timestamps = requestLogs.computeIfAbsent(key, k -> new ArrayDeque<>());

        // Evict expired timestamps older than sliding window
        while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStart) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxRequests) {
            return false;
        }

        timestamps.addLast(now);
        return true;
    }

    public synchronized void reset(String key) {
        requestLogs.remove(key);
    }
}

