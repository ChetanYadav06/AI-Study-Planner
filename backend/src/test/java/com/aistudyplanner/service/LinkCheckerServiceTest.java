package com.aistudyplanner.service;

import com.aistudyplanner.dto.ResourceCheckResult;
import com.aistudyplanner.entity.ResourceLinkCheck;
import com.aistudyplanner.repository.ResourceLinkCheckRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LinkCheckerServiceTest {

    @Mock
    private ResourceLinkCheckRepository checkRepository;

    private LinkCheckerService linkCheckerService;

    @BeforeEach
    void setUp() {
        linkCheckerService = new LinkCheckerService(checkRepository);
    }

    @Test
    void testAllowlistAllowedHosts() {
        assertTrue(linkCheckerService.isAllowedHost("docs.spring.io"));
        assertTrue(linkCheckerService.isAllowedHost("spring.io"));
        assertTrue(linkCheckerService.isAllowedHost("react.dev"));
        assertTrue(linkCheckerService.isAllowedHost("developer.mozilla.org"));
        assertTrue(linkCheckerService.isAllowedHost("doc.rust-lang.org"));
        assertTrue(linkCheckerService.isAllowedHost("docs.docker.com"));
        assertTrue(linkCheckerService.isAllowedHost("kubernetes.io"));
        assertTrue(linkCheckerService.isAllowedHost("tensorflow.org"));
        assertTrue(linkCheckerService.isAllowedHost("postgresql.org"));
    }

    @Test
    void testRejectNonAllowlistedHost() {
        assertFalse(linkCheckerService.isAllowedHost("evil.com"));
        assertFalse(linkCheckerService.isAllowedHost("google.com.attacker.com"));
        assertFalse(linkCheckerService.isAllowedHost("react.dev.attacker.com"));
        assertFalse(linkCheckerService.isAllowedHost("169.254.169.254"));
    }

    @Test
    void testValidateSafeUrlRejectsUserInfo() {
        URI uri = URI.create("https://admin:pass@docs.spring.io/guide");
        assertThrows(IllegalArgumentException.class, () -> linkCheckerService.validateSafeUrl(uri));
    }

    @Test
    void testValidateSafeUrlRejectsNonHttpScheme() {
        URI uri = URI.create("file:///etc/passwd");
        assertThrows(IllegalArgumentException.class, () -> linkCheckerService.validateSafeUrl(uri));
    }

    @Test
    void testValidateSafeUrlRejectsPrivateHost() {
        // localhost or loopback
        URI uri = URI.create("http://localhost:8080/api");
        assertThrows(IllegalArgumentException.class, () -> linkCheckerService.validateSafeUrl(uri));
    }

    @Test
    void testCached7DaysRule() {
        String testUrl = "https://react.dev/learn";
        String hash = LinkCheckerService.computeSha256(testUrl);

        ResourceLinkCheck cached = new ResourceLinkCheck(hash, testUrl, 200, true, null);
        cached.setCheckedAt(LocalDateTime.now().minusDays(3)); // 3 days ago -> fresh
        when(checkRepository.findByUrlHash(hash)).thenReturn(Optional.of(cached));

        ResourceCheckResult result = linkCheckerService.checkSingleUrl(testUrl);

        assertNotNull(result);
        assertTrue(result.isReachable());
        assertEquals(200, result.getStatusCode());
        // Should not call save since cached is fresh
        verify(checkRepository, never()).save(any());
    }
}
