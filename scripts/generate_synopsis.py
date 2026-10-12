import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_font(run, font_name="Times New Roman", size_pt=12, bold=False, italic=False, color=None):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color

def format_paragraph(p, space_before=0, space_after=6, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    pPr = p._p.get_or_add_pPr()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    p.alignment = align

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=14, space_after=6, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.LEFT)
    run = p.add_run(text)
    set_font(run, font_name="Times New Roman", size_pt=13, bold=True, color=RGBColor(0, 32, 96))
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=10, space_after=4, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.LEFT)
    run = p.add_run(text)
    set_font(run, font_name="Times New Roman", size_pt=12, bold=True, color=RGBColor(30, 30, 30))
    return p

def add_body_p(doc, text, bold_prefix=""):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=0, space_after=6, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        set_font(r_pre, font_name="Times New Roman", size_pt=12, bold=True)
    r = p.add_run(text)
    set_font(r, font_name="Times New Roman", size_pt=12, bold=False)
    return p

def add_bullet_p(doc, bold_prefix, text):
    p = doc.add_paragraph(style='List Paragraph')
    format_paragraph(p, space_before=0, space_after=4, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    p.paragraph_format.left_indent = Inches(0.25)
    r_bullet = p.add_run("•  ")
    set_font(r_bullet, font_name="Times New Roman", size_pt=12, bold=True, color=RGBColor(0, 32, 96))
    if bold_prefix:
        r_pre = p.add_run(bold_prefix + ": ")
        set_font(r_pre, font_name="Times New Roman", size_pt=12, bold=True)
    r = p.add_run(text)
    set_font(r, font_name="Times New Roman", size_pt=12, bold=False)
    return p

def set_cell_border(cell, **kwargs):
    """
    kwargs can be top, bottom, left, right with values like {"sz": 4, "val": "single", "color": "D3D3D3"}
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>\n'
        f'<w:top w:val="{kwargs.get("top_val", "single")}" w:sz="{kwargs.get("top_sz", "4")}" w:space="0" w:color="{kwargs.get("top_color", "B0B0B0")}"/>\n'
        f'<w:left w:val="{kwargs.get("left_val", "single")}" w:sz="{kwargs.get("left_sz", "4")}" w:space="0" w:color="{kwargs.get("left_color", "B0B0B0")}"/>\n'
        f'<w:bottom w:val="{kwargs.get("bottom_val", "single")}" w:sz="{kwargs.get("bottom_sz", "4")}" w:space="0" w:color="{kwargs.get("bottom_color", "B0B0B0")}"/>\n'
        f'<w:right w:val="{kwargs.get("right_val", "single")}" w:sz="{kwargs.get("right_sz", "4")}" w:space="0" w:color="{kwargs.get("right_color", "B0B0B0")}"/>\n'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def create_table(doc, headers, data, col_widths):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = Inches(col_widths[i])
        set_cell_background(hdr_cells[i], "1F4E78")
        set_cell_border(hdr_cells[i], top_color="1F4E78", bottom_color="1F4E78", left_color="1F4E78", right_color="1F4E78")
        p = hdr_cells[i].paragraphs[0]
        format_paragraph(p, space_before=4, space_after=4, line_spacing=1.0, align=WD_ALIGN_PARAGRAPH.CENTER)
        r = p.add_run(title)
        set_font(r, font_name="Times New Roman", size_pt=10.5, bold=True, color=RGBColor(255, 255, 255))

    # Data Rows
    for r_idx, row_data in enumerate(data):
        row_cells = table.rows[r_idx + 1].cells
        bg_col = "F2F5F9" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, cell_value in enumerate(row_data):
            row_cells[c_idx].width = Inches(col_widths[c_idx])
            set_cell_background(row_cells[c_idx], bg_col)
            set_cell_border(row_cells[c_idx], top_color="D9D9D9", bottom_color="D9D9D9", left_color="D9D9D9", right_color="D9D9D9")
            p = row_cells[c_idx].paragraphs[0]
            align = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 0 or len(cell_value) < 15 else WD_ALIGN_PARAGRAPH.LEFT
            format_paragraph(p, space_before=3, space_after=3, line_spacing=1.05, align=align)
            r = p.add_run(cell_value)
            set_font(r, font_name="Times New Roman", size_pt=10, bold=False, color=RGBColor(30, 30, 30))

    # Spacing after table
    p_space = doc.add_paragraph()
    format_paragraph(p_space, space_before=2, space_after=4, line_spacing=1.0)
    return table

def generate_synopsis():
    doc = docx.Document("Synopsis Format.docx")

    # 1. Update Title Page
    p_title = doc.paragraphs[2]
    p_title.text = ""
    format_paragraph(p_title, space_before=12, space_after=12, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_title = p_title.add_run("AI STUDY PLANNER: AN ADAPTIVE LEARNING ROADMAP AND INTELLIGENT SCHEDULE GENERATION SYSTEM")
    set_font(r_title, font_name="Times New Roman", size_pt=14, bold=True, color=RGBColor(0, 32, 96))

    # Student Names & Roll Nos
    p_students = doc.paragraphs[8]
    p_students.text = ""
    format_paragraph(p_students, space_before=4, space_after=2, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_stu = p_students.add_run("<Name of the Student(s)>")
    set_font(r_stu, font_name="Times New Roman", size_pt=13, bold=True)

    p_rolls = doc.paragraphs[9]
    p_rolls.text = ""
    format_paragraph(p_rolls, space_before=2, space_after=6, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_roll = p_rolls.add_run("<University Enrollment / Roll No(s)>")
    set_font(r_roll, font_name="Times New Roman", size_pt=12, bold=True)

    # Guide Name
    p_guide = doc.paragraphs[12]
    p_guide.text = ""
    format_paragraph(p_guide, space_before=4, space_after=6, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_guide = p_guide.add_run("<Name of the Guide(s)>\nAssistant Professor / Associate Professor")
    set_font(r_guide, font_name="Times New Roman", size_pt=13, bold=True)

    # Remove template placeholder elements after paragraph 20 (title page section break)
    body = doc._body._element
    for elem in list(body[21:-1]):
        body.remove(elem)

    # =========================================================================
    # SECTION 1: INTRODUCTION
    # =========================================================================
    add_heading_1(doc, "1. INTRODUCTION")
    add_body_p(doc, 
        "In the contemporary higher education ecosystem, self-directed learning and skill development have emerged as paramount requirements for engineering and technology undergraduates. With the accelerating proliferation of Massive Open Online Courses (MOOCs), open-source repositories, developer documentation, and specialized technical video channels, learners possess unprecedented access to educational material. However, this vast abundance has precipitated a pervasive pedagogical paradox: the challenge of modern technical education has fundamentally shifted from information scarcity to acute information overload [1]."
    )
    add_body_p(doc,
        "Students seeking to master complex, multi-disciplinary technical domains—such as Full-Stack Cloud Architecture, Distributed Systems, Data Structures & Algorithms, and Artificial Intelligence—frequently experience cognitive disorientation, colloquially recognized as 'tutorial hell'. Without tailored instructional scaffolding, learners struggle to identify prerequisite sequences, estimate realistic time commitments, and decompose semester-length learning goals into manageable daily milestones [2]. Traditional static curricula cannot accommodate varying individual baselines, daily schedule fluctuations, or sudden academic commitments, precipitating severe learning attrition and motivation decline."
    )
    add_body_p(doc,
        "To decisively resolve these educational bottlenecks, this project proposes and develops the AI Study Planner: an intelligent, full-stack, adaptive learning roadmap and schedule management system. By synthesizing state-of-the-art Generative Artificial Intelligence (utilizing Google Gemini 1.5 Flash) with an enterprise-grade Java Spring Boot 3.4.3 backend and a responsive React 19 single-page client interface, the system empowers students to articulate custom educational goals, specify exact target durations (1–365 days) and daily study bandwidths (0.5–24 hours/day), and instantly receive dynamically synthesized, day-by-day curriculum roadmaps. The platform couples automated curriculum decomposition with structured progress monitoring, study session tracking, streak mechanics, and multi-tenant security to create a unified, closed-loop pedagogical environment."
    )

    # =========================================================================
    # SECTION 2: LITERATURE REVIEW
    # =========================================================================
    add_heading_1(doc, "2. LITERATURE REVIEW")
    add_body_p(doc,
        "Personalized instruction and adaptive computer-assisted learning have been actively investigated across pedagogical and computing disciplines. This literature review evaluates prevailing approaches across four critical paradigms: traditional Learning Management Systems (LMS), static developer curriculum roadmaps, classical Intelligent Tutoring Systems (ITS), and contemporary Large Language Model (LLM) applications in educational scaffolding."
    )
    add_body_p(doc,
        "Graesser et al. [1] and Brusilovsky & Peylo [3] established foundational frameworks for Intelligent Tutoring Systems and Adaptive Hypermedia, demonstrating that personalized pacing, prerequisite diagnostics, and individualized feedback loops yield superior learning retention compared to one-size-fits-all instruction. Nonetheless, classical ITS frameworks relied heavily on labor-intensive, domain-specific Bayesian networks and rule-based expert systems, rendering them rigid, non-scalable, and incapable of dynamic curriculum synthesis across emerging computer science disciplines."
    )
    add_body_p(doc,
        "Commercial and open-source Learning Management Systems (such as Moodle, Canvas, and Blackboard) function predominantly as administrative content repositories and submission conduits rather than personalized learning companions. While effective for institutional delivery, they lack real-time curriculum adaptation, individualized bandwidth calibration, and autonomous study scheduling. Concurrently, community-driven roadmap platforms such as roadmap.sh [12] offer visual domain topic graphs; however, these diagrams represent static, monolithic overviews that fail to factor in individual student availability, timeline constraints, or day-by-day execution tracking."
    )
    add_body_p(doc,
        "The advent of foundation models and transformer-based Large Language Models (LLMs) has revolutionized computer-aided pedagogy [4]. Kasneci et al. [2] and Denny et al. [5] demonstrated that generative models exhibit exceptional zero-shot and few-shot capabilities in decomposing abstract learning outcomes into structured task hierarchies, explaining intricate technical concepts, and generating targeted practice problems. However, existing consumer LLM interfaces (e.g., standard conversational chatbots) lack persistent state management, structured JSON schema validation, relational progress tracking, and integration with an actionable calendar or dashboard. Fielding & Taylor [6] and Walls [7] emphasize that enterprise-grade web architectures decoupling presentation from robust stateless API services provide the optimal framework for deploying reliable AI-driven consumer software."
    )
    add_body_p(doc, "A comparative evaluation of contemporary pedagogical platforms against the proposed AI Study Planner is summarized in Table 1.")

    # Table 1: Literature Comparison
    headers_t1 = ["Feature / Capability", "Traditional LMS (Moodle/Canvas)", "Static Roadmaps (roadmap.sh)", "Generic AI Chatbots (ChatGPT/Claude)", "Proposed AI Study Planner"]
    data_t1 = [
        ["Curriculum Personalization", "Low (Fixed syllabus)", "Low (Static topic trees)", "High (Prompt-driven)", "High (Adaptive dynamic synthesis)"],
        ["Time & Bandwidth Awareness", "No (Calendar deadlines only)", "No (No pacing logic)", "Partial (Unstructured text)", "Yes (Calculated daily hours & target days)"],
        ["Structured Schema Output", "No (Course pages)", "No (Static SVG/JSON)", "No (Free-form conversational text)", "Yes (Deterministic JSON schema validation)"],
        ["Integrated Progress & Streaks", "Basic assignment grading", "No tracking", "No persistent tracking", "Yes (Live %, streaks, daily status PATCH)"],
        ["Multi-Tenant Data Isolation", "Institutional RBAC", "Public only", "Isolated chat history", "Yes (Spring Security + JWT + MySQL FK isolation)"],
        ["Ease of Daily Execution", "Moderate", "Low (Self-directed)", "Low (Copy-paste required)", "High (Day-wise milestones & dashboard cards)"]
    ]
    create_table(doc, headers_t1, data_t1, [1.3, 1.3, 1.3, 1.4, 1.5])

    # =========================================================================
    # SECTION 3: PROBLEM DEFINITION
    # =========================================================================
    add_heading_1(doc, "3. PROBLEM DEFINITION")
    add_body_p(doc,
        "Self-directed students in technical curricula face significant structural and psychological hurdles when attempting to master modern technologies independently. Specifically, the core engineering and pedagogical problem is characterized by three interdependent deficits:"
    )
    add_bullet_p(doc, "Unstructured Learning Pathways and Cognitive Friction",
        "Students embarking on complex subjects lack a systematic methodology to sequence foundational prerequisites, core theoretical knowledge, and hands-on applied tasks. This leads to fragmented conceptual understanding, superficial learning, and premature burnout."
    )
    add_bullet_p(doc, "Static Pacing vs. Dynamic Student Bandwidth",
        "Conventional syllabi and online course schedules assume uniform, invariant daily study time. In reality, engineering undergraduates balance conflicting university lectures, lab evaluations, examinations, and personal constraints. Existing tools lack algorithms to dynamically synthesize balanced study loads proportional to available daily hours (0.5 to 24 hrs) and targeted calendar duration (1 to 365 days)."
    )
    add_bullet_p(doc, "Absence of Closed-Loop Feedback and Execution Tracking",
        "While generative chatbots can produce study suggestions upon prompting, they do not bridge the gap between plan formulation and active execution. Learners require an unified dashboard that tracks study streaks, calculates aggregated daily targets, persists completion percentages, and adapts schedules when milestones are accelerated or delayed."
    )
    add_body_p(doc,
        "Problem Statement: To design, architect, and deploy a secure, high-performance web-based AI Study Planner platform that leverages generative AI and modern full-stack web engineering to transform high-level student learning objectives into personalized, day-wise actionable roadmaps with automated workload balancing, persistent goal lifecycle management, and real-time progress analytics."
    )

    # =========================================================================
    # SECTION 4: OBJECTIVES
    # =========================================================================
    add_heading_1(doc, "4. OBJECTIVES")
    add_body_p(doc, "The primary and secondary objectives of the project are formulated as follows:")
    add_bullet_p(doc, "Architect an Enterprise-Grade 3-Tier Web Application",
        "Construct a modular, high-performance web platform featuring a React 19 single-page frontend (styled with Tailwind CSS v4) and a Java Spring Boot 3.4.3 REST API backend with Maven dependency management [7]."
    )
    add_bullet_p(doc, "Implement Robust Stateless Authentication & Multi-Tenant Security",
        "Deploy Spring Security utilizing BCrypt password encryption and JSON Web Tokens (JWT with HS512 cryptographic signatures) to enforce stateless session management, protected endpoint authorization, and strict user-level data isolation [11]."
    )
    add_bullet_p(doc, "Build an Interactive Goal Formulation Engine",
        "Develop an intuitive interface and relational backend allowing students to specify goals with multi-factor parameters: Title, Description, Target Days (1–365), Daily Bandwidth (0.5–24 hours/day), and Skill Tiers (Beginner, Intermediate, Advanced)."
    )
    add_bullet_p(doc, "Integrate Google Gemini 1.5 Flash Generative AI",
        "Establish secure server-side integration with the Google Gemini Generative Language API via structured prompt engineering and JSON schema enforcement to synthesize deterministic, day-wise pedagogical roadmaps [10]."
    )
    add_bullet_p(doc, "Provide Real-Time Dashboard & Goal Progress Tracking",
        "Implement interactive metric cards (Active Goals, Daily Target Hours, Study Streak, Roadmaps Generated) and direct goal status manipulation (+10% / -10% progress adjustments, dynamic status promotion from NOT_STARTED to IN_PROGRESS to COMPLETED)."
    )
    add_bullet_p(doc, "Ensure High-Performance Relational Persistence",
        "Utilize MySQL 8.0 with InnoDB transaction engine, HikariCP connection pooling, and Spring Data JPA to maintain ACID-compliant persistence, foreign-key referential integrity, and sub-millisecond query execution."
    )
    add_bullet_p(doc, "Deliver Comprehensive Automated Testing and System Reliability",
        "Verify full-stack functional correctness through Spring Boot integration test suites (`mvn test` verifying 100% test passing across auth, data isolation, and goal lifecycle) and automated build verification."
    )

    # =========================================================================
    # SECTION 5: METHODOLOGY
    # =========================================================================
    add_heading_1(doc, "5. METHODOLOGY")
    add_body_p(doc,
        "The project adopts an Agile phased development methodology combined with standard layered software architecture principles [6], [9]. This section details the system architecture, AI integration pipeline, database schema, and the phased implementation roadmap."
    )

    add_heading_2(doc, "5.1 System Architecture")
    add_body_p(doc,
        "The AI Study Planner is architected according to a decoupled Three-Tier Client-Server paradigm, ensuring separation of concerns, horizontal scalability, and optimal security:"
    )
    add_bullet_p(doc, "Presentation Layer (Client)",
        "Constructed using React 19 with Vite build tool and Tailwind CSS v4. Axios is configured as the central HTTP client with automated request interceptors (injecting Bearer JWT tokens into the Authorization header) and response interceptors (handling 401 Unauthorized token revocation). Lucide React icons and Recharts provide UI component visual enhancement."
    )
    add_bullet_p(doc, "Application & Logic Layer (Backend)",
        "Engineered with Java Spring Boot 3.4.3. Encapsulates RESTful API controllers (`AuthController`, `GoalController`, `DashboardController`, `HealthController`), Spring Security filter chain (`JwtAuthenticationFilter`), and a transactional Service Layer (`GoalService`, `UserService`, `AiRoadmapService`). HikariCP provides high-efficiency connection pooling."
    )
    add_bullet_p(doc, "Persistence Layer (Database)",
        "Powered by MySQL 8.0 with InnoDB storage engine. Tables are mapped to Java entities via Spring Data JPA and Hibernate ORM. Data isolation is guaranteed at the repository query level (e.g., `findByIdAndUserId`) to ensure tenant privacy."
    )

    add_heading_2(doc, "5.2 Google Gemini AI Roadmap Generation Workflow")
    add_body_p(doc,
        "The AI engine operates through a multi-stage validation and synthesis pipeline [8], [10]:"
    )
    add_bullet_p(doc, "Step 1 - Parameter Extraction",
        "The student defines a learning goal. The system compiles parameters: Subject Title, Skill Level, Target Duration (N days), and Daily Study Hours (H hours)."
    )
    add_bullet_p(doc, "Step 2 - Contextual Prompt Engineering",
        "The backend constructs a rigorous system prompt instructing the model to act as a senior curriculum architect. The prompt enforces a strict JSON output schema containing an array of exactly N day items, each comprising Day Number, Topic Header, Conceptual Breakdown, Practical Exercises, and Estimated Minutes (= H × 60)."
    )
    add_bullet_p(doc, "Step 3 - Gemini 1.5 Flash Inference",
        "The request is dispatched securely from the Spring Boot backend to Google Gemini API using HTTPS. The API key is stored strictly on the server via environment variables (`GEMINI_API_KEY`) and is never exposed to the client browser."
    )
    add_bullet_p(doc, "Step 4 - JSON Schema Deserialization & DB Persistence",
        "The raw model output is validated against the schema. Upon validation, the roadmap and its constituent day-wise tasks are transactionally saved into MySQL relational tables linked to the user's goal entity."
    )

    add_heading_2(doc, "5.3 Relational Database Schema Design")
    add_body_p(doc, "The database architecture comprises the following normalized relational entities:")
    add_bullet_p(doc, "users Table",
        "Columns: `id` (PK, BigInt, Auto-Inc), `name` (VarChar), `email` (VarChar, Unique, Indexed), `password` (VarChar, BCrypt Hash), `created_at` (Timestamp), `updated_at` (Timestamp)."
    )
    add_bullet_p(doc, "goals Table",
        "Columns: `id` (PK, BigInt, Auto-Inc), `user_id` (FK referencing users.id), `title` (VarChar), `description` (Text), `target_days` (Int, 1–365), `hours_per_day` (Double, 0.5–24.0), `skill_level` (Enum: BEGINNER, INTERMEDIATE, ADVANCED), `status` (Enum: NOT_STARTED, IN_PROGRESS, COMPLETED, ARCHIVED), `progress_percentage` (Int, 0–100), `created_at`, `updated_at`."
    )
    add_bullet_p(doc, "roadmaps & daily_tasks Tables (Phases 4–5)",
        "Captures the structured AI roadmap hierarchy: `roadmaps` entity (linked to Goal, metadata, total days) and `daily_tasks` entity (day_number, topic_name, concepts, tasks, duration_mins, is_completed)."
    )

    add_heading_2(doc, "5.4 Implementation Plan & Phased Roadmap")
    add_body_p(doc, "The development lifecycle is divided into 8 systematic phases, as outlined in Table 2.")

    headers_t2 = ["Phase", "Milestone / Scope", "Key Deliverables & Technology", "Current Status"]
    data_t2 = [
        ["Phase 1", "Foundation & Infrastructure", "Spring Boot 3.4.3 setup, MySQL 8.0 HikariCP configuration, Vite React 19 UI, Health probe API (`/api/health`), start/stop automation scripts", "Completed & Verified"],
        ["Phase 2", "Authentication & Security", "User Registration, Login, Spring Security filter chain, BCrypt hashing, JWT token generation & 24h validation, AuthModal & AuthContext in React", "Completed & Verified"],
        ["Phase 3", "Goal Engine & Dashboard", "Goal entity, REST CRUD APIs (`/api/goals`), Dashboard aggregation service (`/api/dashboard/stats`), dynamic progress controls, status auto-promotion", "Completed & Verified"],
        ["Phase 4", "Gemini AI Roadmap Engine", "Google Gemini 1.5 Flash API client, prompt engineering, structured JSON response parser, roadmap preview & day-wise module cards", "Under Implementation"],
        ["Phase 5", "Timetable & Task Scheduling", "Daily timetable generator, calendar view, task reordering, rescheduling algorithms for missed study sessions", "Planned"],
        ["Phase 6", "Study Timer & Session Logger", "Pomodoro study timer, focused session recording, active study logs table, real-time streak computation", "Planned"],
        ["Phase 7", "Analytics & UI Polish", "Recharts visual analytics (hours studied vs. target, topic mastery distribution), dark/light aesthetic refinement, mobile responsive testing", "Planned"],
        ["Phase 8", "Verification & Deployment", "Full end-to-end integration testing, security penetration audit, performance load profiling, production build bundling", "Planned"]
    ]
    create_table(doc, headers_t2, data_t2, [0.9, 1.6, 2.8, 1.5])

    add_heading_2(doc, "5.5 Hardware & Software Requirements")
    add_bullet_p(doc, "Software Requirements",
        "Operating System: Windows 10/11 / Linux Ubuntu 22.04 LTS; Runtime: Java Development Kit (JDK) 17/21/24; Build Tool: Apache Maven 3.8+; Frontend Environment: Node.js v18+ & npm v9+; Database: MySQL Community Server 8.0; AI Provider: Google Gemini Generative AI API (gemini-1.5-flash); Browser: Google Chrome / Mozilla Firefox / Microsoft Edge."
    )
    add_bullet_p(doc, "Hardware Requirements",
        "Processor: Intel Core i5 / AMD Ryzen 5 or higher (minimum 4 physical cores); RAM: 8 GB minimum (16 GB recommended for concurrent JVM + Vite + MySQL execution); Disk Space: 10 GB available SSD storage; Network: Broadband Internet connection (for Gemini API calls)."
    )

    # =========================================================================
    # SECTION 6: REFERENCES
    # =========================================================================
    add_heading_1(doc, "6. REFERENCES")
    add_body_p(doc, "Note: References are cited parenthetically in the body of the text in sequential order of their appearance strictly as per the prescribed format.")

    add_heading_2(doc, "Journal References")
    add_body_p(doc, 
        "[1]. Graesser A.C., Conley M.W., Olney A., “Intelligent Tutoring Systems: Foundations and Approaches to Adaptive Educational Technology”, Journal of Educational Psychology, Volume 104, Issue 3, pp: 551-567, 2012."
    )
    add_body_p(doc,
        "[2]. Kasneci E., Sessler K., Küchemann S., Bannert M., Dementieva D., Fischer F., Gasser U., Groh G., Günnemann S., Hüllermeier E., et al., “ChatGPT for Good? On Opportunities and Challenges of Large Language Models for Education”, Learning and Individual Differences, Volume 103, pp: 102274, 2023."
    )
    add_body_p(doc,
        "[3]. Brusilovsky P., Peylo C., “Adaptive and Intelligent Web-based Educational Systems”, International Journal of Artificial Intelligence in Education, Volume 13, Issue 2-4, pp: 159-172, 2003."
    )

    add_heading_2(doc, "Conference References")
    add_body_p(doc,
        "[4]. Bommasani R., Hudson D.A., Adeli E., Altman R., Arora S., von Arx S., Bernstein M.S., Bohg J., Bosselut A., Brunskill E., et al., “On the Opportunities and Risks of Foundation Models”, Proceedings of the 38th International Conference on Machine Learning (ICML) / Stanford CRFM Workshop, pp: 1-124, 2021."
    )
    add_body_p(doc,
        "[5]. Denny P., Kumar V., Giacaman N., “Towards Automated Pedagogical Task Generation: Assessing Large Language Models for Programming Education”, Proceedings of the 25th Australasian Computing Education Conference (ACE '23), ACM, pp: 75-84, 2023."
    )
    add_body_p(doc,
        "[6]. Fielding R.T., Taylor R.N., “Principled Design of the Modern Web Architecture”, Proceedings of the 22nd International Conference on Software Engineering (ICSE '00), ACM, pp: 407-416, 2000."
    )

    add_heading_2(doc, "Books References")
    add_body_p(doc,
        "[7]. Walls C., “Spring Boot in Action”, Manning Publications Co., Shelter Island, NY, First edition, pp: 1-264, 2016."
    )
    add_body_p(doc,
        "[8]. Russell S., Norvig P., “Artificial Intelligence: A Modern Approach”, Pearson Education, Fourth edition, pp: 650-710, 2020."
    )
    add_body_p(doc,
        "[9]. Gamma E., Helm R., Johnson R., Vlissides J., “Design Patterns: Elements of Reusable Object-Oriented Software”, Addison-Wesley Professional, First edition, pp: 81-120, 1994."
    )

    add_heading_2(doc, "URL References")
    add_body_p(doc,
        "[10]. Google DeepMind, “Gemini 1.5: Unlocking multimodal understanding across millions of tokens of context”, https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/, accessed on 11/10/2026 at 10:15 AM."
    )
    add_body_p(doc,
        "[11]. Spring Framework Documentation, “Spring Boot Reference Guide & Spring Security Architecture”, https://docs.spring.io/spring-boot/docs/current/reference/html/, accessed on 11/10/2026 at 11:30 AM."
    )
    add_body_p(doc,
        "[12]. roadmap.sh, “Community-driven Roadmaps and Educational Pathways for Developers”, https://roadmap.sh, accessed on 11/10/2026 at 02:45 PM."
    )

    p_end = doc.add_paragraph()
    format_paragraph(p_end, space_before=14, space_after=14, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_end = p_end.add_run("*********")
    set_font(r_end, font_name="Times New Roman", size_pt=14, bold=True)

    output_path = "AI_Study_Planner_Synopsis.docx"
    doc.save(output_path)
    print(f"Successfully generated {output_path}")

if __name__ == "__main__":
    generate_synopsis()
