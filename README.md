# 🤖 Praxis-IT Agent Studio

> **Kaggle AI Agent Capstone Project Prototype**  
> **Track:** Agents for Business / Freestyle  
> **Target Repository:** [bsenst/praxis-it](https://github.com/bsenst/praxis-it)

---

## 📖 Project Overview & Problem Statement

Modern healthcare digitalization requires practitioners to keep up-to-date with complex, rapidly evolving IT specifications, guidelines, and security practices (e.g., Telematics Infrastructure, KIM-Dienst, eHBA, and DSGVO regulations). The repository `bsenst/praxis-it` acts as a central hub of Quarto Markdown (`.qmd`) documents documenting medical IT knowledge.

However, adding, auditing, and organizing incoming articles into this repository is highly friction-filled. Busy clinical personnel lack the time to manually search through dozens of existing `.qmd` categories, determine if an article's topic has already been covered, write formatted Quarto summaries, or determine where to insert new information.

### 💡 The Solution: Praxis-IT Agent Studio
An intelligent **Multi-Agent Co-Processing Workspace** that automates the verification, summarization, and routing of medical-IT articles. Using a fully integrated interface, it coordinates two distinct, specialized agents to streamline this workflow while ensuring **100% operational uptime** through a **zero-dependency, resilient offline-heuristic engine**.

---

## 🏆 Key Agent Concepts Demonstrated (Capstone Evaluation Matrix)

| Key Concept | Implementation & Demonstration in this App |
| :--- | :--- |
| **Agent / Multi-Agent System (ADK)** | A cooperative dual-agent architecture: **Agent 1 (GitHub Checker)** does semantic routing and duplicate checking; **Agent 2 (Summarizer)** handles content compilation and structured Quarto formatting. |
| **MCP (Model Context Protocol)** | Implements a simulated **MCP JSON-RPC Gateway** which maps file registries and standardizes communication between our offline heuristic models and GitHub storage targets. |
| **Antigravity Design** | Adheres to the *Antigravity* concept of lightweight, zero-configuration, CPU-friendly execution. No heavy-weight runtime containers, zero latency, and fully serverless-compliant. |
| **Security & Privacy** | Under the **Local Resilient Offline-Engine**, no data leaves the browser/server environment. Perfect for clinical settings (no Patient Health Information or PHI leaked to third-party APIs) and zero API key exposure. |
| **Deployability** | Architected for dual-stack deployment: A fast **React + Express/TypeScript** production server and a **Streamlit Cloud** (`app.py`) app for instant, CPU-friendly serverless deployment. |
| **Agent Skills (CLI & Direct Links)** | Generates direct GitHub edit URLs with target branch anchors, acting as an interactive bridge back to Git pipelines. |

---

## 🤖 Multi-Agent Architecture & Coordination Flow

The app operates a synchronous pipeline where agents collaborate in a structured chain of custody:

```
                  [ User Inputs Article ]
                            │
                            ▼
               ┌───────────────────────────┐
               │  Agent 1: GitHub Checker  │
               └─────────────┬─────────────┘
                             │
            Is topic already in repo?
            ┌───────────────┴───────────────┐
            ▼ YES                           ▼ NO
   [Show Existing File Link]       ┌─────────────────────────┐
                                   │   Agent 2: Summarizer   │
                                   └────────────┬────────────┘
                                                │
                                    [Generate Quarto summary &]
                                    [Show GitHub direct edit link]
```

### 1. Agent 1: GitHub Checker Agent
- **Goal:** Scan the target repository (`bsenst/praxis-it` under branch `bsenst-patch-1`) to find either a semantic match or the single most relevant existing `.qmd` document.
- **Reasoning Process:** Compares incoming article title and body against a dictionary of curated category-specific keywords (such as `it-sicherheit`, `kimdienst`, `dermatologie`, `diabetologie`, etc.). It computes a frequency-weighted matching score to resolve conflicts and output precise routing classifications.

### 2. Agent 2: Summarizer Agent
- **Goal:** Condense dense clinical-IT text into structured, standard Quarto Markdown (`.qmd`) with front-matter metadata ready for integration.
- **Reasoning Process:** Extracts high-priority sentences based on keyword-density scores and formats them into a clean executive summary accompanied by a targeted, actionable checklist tailored to the specific domain (e.g. key security protocols for KIM-Dienst or legal/integration steps for AI dermatology).

---

## 🔌 The Model Context Protocol (MCP) Integration

To standardise tool calling and directory indexing, the agents exchange messages formatted after the **Model Context Protocol (MCP) JSON-RPC standard**. This allows the workspace to cleanly separate model orchestration from physical API calls:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "github-server::list_directory_contents",
    "arguments": {
      "owner": "bsenst",
      "repo": "praxis-it",
      "path": "/"
    }
  },
  "id": "mcp-call-python-771"
}
```

This structural separation ensures that if an actual GitHub API integration is mounted later, the agent logic remains entirely untouched.

---

## 💻 Tech Stack & Setup Instructions

The prototype is dual-engineered for development preview and simple production hosting.

### Option A: Local Full-Stack App (Vite + React + Express)

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Start Dev Server (binds to port 3000):**
   ```bash
   npm run dev
   ```
3. **Build and Start Production Server:**
   ```bash
   npm run build
   npm start
   ```

### Option B: Streamlit Cloud Serverless Deployment (`app.py`)

Perfect for direct deployment to **Streamlit Cloud** (which runs on serverless CPU instances):

1. **Install Python Packages:**
   ```bash
   pip install streamlit requests
   ```
2. **Run Streamlit App:**
   ```bash
   streamlit run app.py
   ```

---

## 🌟 Security, Privacy & Heuristics

Traditional LLM implementations fail in clinical settings because sending medical texts or organizational practices to central APIs poses massive data leakage hazards. 

The **Praxis-IT Agent Studio** mitigates this by relying exclusively on the **Local Resilient Offline-Engine**:
- **100% Client-Safe:** No network requests are dispatched to external AI systems.
- **Zero Token Cost:** No model API subscriptions, keys, or rate limits.
- **Deterministic Formatting:** Outputs pristine, standard Markdown every time without hallucinating or corrupting critical guidelines.

---
*This repository serves as a fully functional submission prototype for the Kaggle 5-Day AI Agents Intensive Course Capstone.*
