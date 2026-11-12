package com.aistudyplanner.service;

import com.aistudyplanner.dto.RoadmapJobResponse;
import com.aistudyplanner.dto.RoadmapRequest;
import com.aistudyplanner.dto.RoadmapResponse;
import com.aistudyplanner.exception.RoadmapGenerationException;
import com.aistudyplanner.security.SlidingWindowRateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;

@Service
public class RoadmapJobService {

    private static final Logger log = LoggerFactory.getLogger(RoadmapJobService.class);
    private static final long JOB_TTL_MINUTES = 30;

    public static class JobRecord {
        private final String jobId;
        private final String userEmail;
        private final Instant createdAt;
        private volatile RoadmapJobResponse.State state;
        private volatile int phasesDone;
        private volatile int phasesTotal;
        private volatile String message;
        private volatile RoadmapResponse result;
        private volatile String errorCode;
        private volatile CompletableFuture<Void> future;

        public JobRecord(String jobId, String userEmail, Instant createdAt, RoadmapJobResponse.State state, int phasesDone, int phasesTotal, String message) {
            this.jobId = jobId;
            this.userEmail = userEmail;
            this.createdAt = createdAt;
            this.state = state;
            this.phasesDone = phasesDone;
            this.phasesTotal = phasesTotal;
            this.message = message;
        }

        public String getJobId() { return jobId; }
        public String getUserEmail() { return userEmail; }
        public Instant getCreatedAt() { return createdAt; }
        public RoadmapJobResponse.State getState() { return state; }
        public void setState(RoadmapJobResponse.State state) { this.state = state; }
        public int getPhasesDone() { return phasesDone; }
        public void setPhasesDone(int phasesDone) { this.phasesDone = phasesDone; }
        public int getPhasesTotal() { return phasesTotal; }
        public void setPhasesTotal(int phasesTotal) { this.phasesTotal = phasesTotal; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public RoadmapResponse getResult() { return result; }
        public void setResult(RoadmapResponse result) { this.result = result; }
        public String getErrorCode() { return errorCode; }
        public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
        public CompletableFuture<Void> getFuture() { return future; }
        public void setFuture(CompletableFuture<Void> future) { this.future = future; }
    }

    private final Map<String, JobRecord> jobStore = new ConcurrentHashMap<>();
    private final RoadmapService roadmapService;
    private final SlidingWindowRateLimiter rateLimiter;
    private final ExecutorService executorService;
    private final int timeoutSeconds;

    @Autowired
    public RoadmapJobService(RoadmapService roadmapService,
                             SlidingWindowRateLimiter rateLimiter,
                             @Value("${roadmap.generation.timeout-seconds:300}") int timeoutSeconds) {
        this(roadmapService, rateLimiter, Executors.newCachedThreadPool(), timeoutSeconds);
    }

    public RoadmapJobService(RoadmapService roadmapService,
                             SlidingWindowRateLimiter rateLimiter,
                             ExecutorService executorService,
                             int timeoutSeconds) {
        this.roadmapService = roadmapService;
        this.rateLimiter = rateLimiter;
        this.executorService = executorService;
        this.timeoutSeconds = timeoutSeconds;
    }

    public String startJob(RoadmapRequest request, String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user required.");
        }
        cleanupExpiredJobs();

        // 1. One active job per user
        boolean hasActive = jobStore.values().stream()
                .anyMatch(j -> j.getUserEmail().equalsIgnoreCase(userEmail) &&
                        (j.getState() == RoadmapJobResponse.State.QUEUED || j.getState() == RoadmapJobResponse.State.RUNNING));
        if (hasActive) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A roadmap generation is already in progress for your account.");
        }

        // 2. Existing generation rate limit (5 per hour)
        String rateLimitKey = "roadmap_gen:" + userEmail.trim().toLowerCase();
        if (!rateLimiter.tryAcquire(rateLimitKey, 5, 3600)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Roadmap generation limit reached (maximum 5 per hour). Please try again later.");
        }

        // 3. Register queued job
        String jobId = UUID.randomUUID().toString();
        JobRecord job = new JobRecord(
                jobId,
                userEmail,
                Instant.now(),
                RoadmapJobResponse.State.QUEUED,
                0,
                0,
                "Initializing generation..."
        );
        jobStore.put(jobId, job);

        // 4. Dispatch async processing
        CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
            try {
                job.setState(RoadmapJobResponse.State.RUNNING);
                RoadmapResponse response = roadmapService.generateRoadmapPerPhase(
                        request,
                        userEmail,
                        (done, total, msg) -> {
                            job.setPhasesDone(done);
                            job.setPhasesTotal(total);
                            job.setMessage(msg);
                        }
                );
                job.setResult(response);
                job.setState(RoadmapJobResponse.State.DONE);
                job.setMessage("Roadmap generation completed successfully.");
            } catch (RoadmapGenerationException e) {
                job.setState(RoadmapJobResponse.State.FAILED);
                if (e.getMessage() != null && (e.getMessage().contains("time budget") || e.getMessage().contains("timed out"))) {
                    job.setErrorCode("TIMEOUT");
                    job.setMessage("The AI took too long. Try again or choose fewer days.");
                } else if (e.getStatus() == HttpStatus.TOO_MANY_REQUESTS) {
                    job.setErrorCode("RATE_LIMITED");
                    job.setMessage("Roadmap generation limit reached (maximum 5 per hour). Please try again later.");
                } else {
                    job.setErrorCode("AI_UNAVAILABLE");
                    job.setMessage("AI service is temporarily unavailable. Please try again later.");
                }
            } catch (Exception e) {
                log.error("Roadmap generation failed for job {}: {}", jobId, e.getMessage());
                job.setState(RoadmapJobResponse.State.FAILED);
                job.setErrorCode("INVALID_PLAN");
                job.setMessage("Generated roadmap did not pass validation checks. Please retry.");
            }
        }, executorService);

        job.setFuture(future);
        return jobId;
    }

    public RoadmapJobResponse getJob(String jobId, String userEmail) {
        cleanupExpiredJobs();
        JobRecord job = jobStore.get(jobId);
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Roadmap generation job not found.");
        }
        if (!job.getUserEmail().equalsIgnoreCase(userEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this roadmap generation job.");
        }
        return new RoadmapJobResponse(
                job.getJobId(),
                job.getState(),
                job.getPhasesDone(),
                job.getPhasesTotal(),
                job.getMessage(),
                job.getResult(),
                job.getErrorCode()
        );
    }

    public void cleanupExpiredJobs() {
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(JOB_TTL_MINUTES));
        jobStore.entrySet().removeIf(entry -> entry.getValue().getCreatedAt().isBefore(cutoff));
    }

    public Map<String, JobRecord> getJobStore() {
        return jobStore;
    }
}
