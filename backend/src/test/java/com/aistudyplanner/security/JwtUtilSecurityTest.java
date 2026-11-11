package com.aistudyplanner.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilSecurityTest {

    @Test
    void testShortSecretFailsOnStartup() {
        String shortSecret = "too-short-secret-under-32-b";
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new JwtUtil(shortSecret, 3600000L));
        assertTrue(ex.getMessage().contains("must be at least 32 bytes"));
    }

    @Test
    void testValidSecretSucceeds() {
        String validSecret = "this-is-a-valid-32-byte-secret-key-1234567890";
        JwtUtil jwtUtil = new JwtUtil(validSecret, 3600000L);
        String token = jwtUtil.generateToken("user@test.com");
        assertNotNull(token);
        assertEquals("user@test.com", jwtUtil.extractEmail(token));
    }
}

