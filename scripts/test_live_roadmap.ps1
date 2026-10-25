$email = 'ai_evaluator_' + (Get-Random) + '@example.com'
$password = 'Password123!'

$regBody = @{
    name = 'AI Evaluator'
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $regRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/register' -Method Post -ContentType 'application/json' -Body $regBody
    $token = $regRes.token
    Write-Host "Registered and got Token for: $($regRes.name) ($email)"
} catch {
    $loginBody = @{ email = $email; password = $password } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
    $token = $loginRes.token
    Write-Host "Logged in and got Token for: $($loginRes.name)"
}

$roadmapBody = @{
    topic = 'Spring Cloud Microservices'
    description = 'Build resilient cloud native microservices'
    skillLevel = 'INTERMEDIATE'
    targetDays = 14
    hoursPerDay = 2.0
    specificTopics = 'Eureka service discovery, Spring Cloud Gateway, OpenFeign, Resilience4j'
    targetOutcomes = 'Deploy working service mesh with fault-tolerant circuit breaking'
    priorKnowledge = 'Spring Boot REST APIs and JPA'
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $token"
}

Write-Host "Calling /api/ai/roadmap with Gemini structured JSON..."
$start = Get-Date
$roadmapRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/ai/roadmap' -Method Post -ContentType 'application/json' -Headers $headers -Body $roadmapBody
$elapsed = ((Get-Date) - $start).TotalSeconds

Write-Host ("Generation completed in: " + [math]::Round($elapsed, 2) + " seconds")
Write-Host ("Topic: " + $roadmapRes.topic)
Write-Host ("Skill Level: " + $roadmapRes.skillLevel)
Write-Host ("Target Days: " + $roadmapRes.targetDays)
Write-Host ("Hours Per Day: " + $roadmapRes.hoursPerDay)
Write-Host ("Total Study Hours: " + $roadmapRes.totalStudyHours)
Write-Host ("Feasibility Note: " + $roadmapRes.feasibilityNote)
Write-Host ("Prerequisites: " + ($roadmapRes.prerequisites -join ', '))
Write-Host ("Phases Count: " + $roadmapRes.phases.Count)

foreach ($phase in $roadmapRes.phases) {
    $pTitle = if ($phase.phaseTitle) { $phase.phaseTitle } else { $phase.phase }
    Write-Host ("  Phase: " + $pTitle + " (" + $phase.duration + ")")
    Write-Host ("    Topics: " + ($phase.topics -join ', '))
    Write-Host ("    Daily Tasks Count: " + $phase.dailyTasks.Count)
    if ($phase.dailyTasks.Count -gt 0) {
        $firstTask = $phase.dailyTasks[0]
        Write-Host ("      Sample Day " + $firstTask.dayNumber + " [" + $firstTask.activityType + " " + $firstTask.estimatedMinutes + "m]: " + $firstTask.title)
    }
    if ($phase.practicalExercises -and $phase.practicalExercises.Count -gt 0) {
        Write-Host ("    Exercise: " + $phase.practicalExercises[0].title + " [" + $phase.practicalExercises[0].difficulty + "]")
    }
    if ($phase.assessment) {
        Write-Host ("    Assessment: " + $phase.assessment.title + " [" + $phase.assessment.type + "]")
    }
}

Write-Host ("Learning Resources Count: " + $roadmapRes.learningResources.Count)
foreach ($res in $roadmapRes.learningResources) {
    Write-Host ("  Resource: " + $res.title + " | " + $res.url + " | Verified: " + $res.verified + " | Type: " + $res.type)
}
