# AI Study Planner — Automation & Utility Scripts

This directory contains development automation, database management, and integration test scripts for the AI Study Planner project.

---

### Scripts Overview

| Script | Type | Description | Usage |
| :--- | :--- | :--- | :--- |
| **`start-mysql.ps1`** | PowerShell | Starts local MySQL 8.0 server in background mode using `.mysql/my.cnf` configuration. | `.\scripts\start-mysql.ps1` |
| **`stop-mysql.ps1`** | PowerShell | Gracefully shuts down the local MySQL 8.0 server process. | `.\scripts\stop-mysql.ps1` |
| **`test_live_roadmap.ps1`** | PowerShell | Runs an end-to-end integration test against the live Spring Boot + Gemini AI roadmap generation endpoint. | `.\scripts\test_live_roadmap.ps1` |
| **`generate_synopsis.py`** | Python | Generates formatted project documentation, architecture synopsis, and report artifacts. | `python scripts/generate_synopsis.py` |

---

### Requirements

- **PowerShell 5.1+** or **PowerShell Core 7+** (Windows)
- **Python 3.10+** (for `generate_synopsis.py`)
- **MySQL 8.0** installed at default path or configured via environment variable
