package com.aistudyplanner.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SlidingWindowRateLimiterTest {

    private SlidingWindowRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new SlidingWindowRateLimiter();
    }

    @Test
    void testAllowsUpToMaxRequests() {
        String key = "user1";
        // Max 3 requests in 10 seconds
        assertTrue(rateLimiter.tryAcquire(key, 3, 10));
        assertTrue(rateLimiter.tryAcquire(key, 3, 10));
        assertTrue(rateLimiter.tryAcquire(key, 3, 10));
        // 4th request rejected
        assertFalse(rateLimiter.tryAcquire(key, 3, 10));
    }

    @Test
    void testResetKey() {
        String key = "user2";
        assertTrue(rateLimiter.tryAcquire(key, 1, 10));
        assertFalse(rateLimiter.tryAcquire(key, 1, 10));

        rateLimiter.reset(key);
        assertTrue(rateLimiter.tryAcquire(key, 1, 10));
    }
}

