# AptiQuiz ⚡
> **Problem Statement 3: Aptitude Practice as a Live Multiplayer Game**  
> *Production-Ready Gamified Placement Prep Platform with Server-Authoritative Timing, Anti-Cheat Protection, College Leagues, and Replay Intelligence.*

---

## 1. What It Does
**AptiQuiz** transforms solitary, monotonous aptitude test preparation into a high-stakes, real-time multiplayer competition for engineering undergraduates preparing for campus recruitment drives and competitive examinations.

### Core Capabilities:
- **Instant Zero-Friction Access**: Hosts create rooms and broadcast a unique **6-character join code** (e.g. `A7X9K2`); participants join as guests in seconds without mandatory credential hurdles.
- **50-Player Synchronized Rooms**: Server broadcasts synchronized questions to up to **50 simultaneous participants** with sub-100ms WebSocket delivery.
- **Server-Authoritative Timers & Speed Scoring**: Tamper-proof UTC epoch countdowns prevent client-clock manipulation. Correct answers earn **100 Base Points + up to 100 Speed Bonus Points** ($\text{Score} = 100 + \lceil(\text{TimeRemaining}/\text{TotalTime}) \times 100\rceil$).
- **Anti-Cheat Defenses**: Answer options are pseudo-randomly shuffled per player to defeat shoulder-surfing. Correct answer IDs and hashes are strictly withheld until round evaluation closes.
- **Live Leaderboard with Color-Blind Rank Deltas**: Instant post-round rank movement updates featuring explicit symbols ($\uparrow, \downarrow, \rightleftarrows$) and point deltas.
- **Replay Intelligence (Mistake-to-Mastery)**: Deterministic, rule-based post-game cognitive analysis that detects weak sub-topics ($\ge 2$ errors), flags impulsive rushing ($<3.5\text{s}$) or concept hesitation ($>15\text{s}$), and prescribes targeted drill modules.
- **College League Standings**: Multi-room score aggregation grouping points by university domain (`iitb.ac.in`, `bits-pilani.ac.in`, `nitt.edu`), highlighting institutional standings and top student contributors.

---

## 2. Done / Left / Plan (Feature Completion Status)

| Requirement / Module | PRD ID | Status | Verification Detail |
| :--- | :---: | :---: | :--- |
| **Question Authoring & Sets** | `FR-01` | **Done** | Curated questions across Quant, Logic, Verbal, and DI with Zod schemas and 4-option validation. |
| **Room Creation & Lobby** | `FR-02` | **Done** | 6-character code generation, 50-player capacity enforcement, duplicate name resolution, and host kick controls. |
| **Synchronized Live Gameplay** | `FR-03` | **Done** | Deterministic server state machine (`LOBBY` $\rightarrow$ `STARTING` $\rightarrow$ `QUESTION_ACTIVE` $\rightarrow$ `ROUND_EVALUATION` $\rightarrow$ `GAME_OVER`). |
| **Speed & Accuracy Scoring** | `FR-04` | **Done** | Transparent scoring formula rewarding both correctness ($100\text{ pts}$) and speed (up to $+100\text{ pts}$). |
| **Live Leaderboard Updates** | `FR-05` | **Done** | Real-time post-round leaderboard broadcast with color-blind rank deltas ($\uparrow, \downarrow, \rightleftarrows$). |
| **Final Results & Analytics** | `FR-06` | **Done** | Match podium, accuracy percentage, average speed in seconds, and persistence to PostgreSQL. |
| **College League Standings** | `FR-07` | **Done** | Institutional points accumulator (`/api/league/standings`) and top student contributor tracking. |
| **50-Player Room Capacity** | `NR-01` | **Done** | Verified via automated `simulation_50_bots.js` script with 50 active socket connections. |
| **Authoritative Server Timing** | `NR-02` | **Done** | Server UTC timestamps; client clocks ignored for round termination. |
| **Fair Network Answer Receipt** | `NR-03` | **Done** | Exact packet arrival timestamps with 250ms bounded TCP jitter grace period. |
| **Option Shuffling Per Player** | `NR-05` | **Done** | Fisher-Yates array permutation per socket; answers masked until evaluation. |
| **Replay Intelligence Insights** | `IN-01` | **Done** | Rule-based mistake analysis identifying weak sub-topics and pacing heuristics. |
| **50-Player Bot Load Script** | `TASK-14` | **Done** | Node.js script spawning 50 concurrent virtual bots measuring latency and throughput. |

---

## 3. Architecture and Why

```mermaid
graph TD
    Client1["React SPA Client 1"] <-->|WebSocket / HTTP| Gateway["Node.js + Express + Socket.io Server"]
    Client2["React SPA Client 2 (Up to 50)"] <-->|WebSocket / HTTP| Gateway
    Gateway <--> StateEngine["In-Memory GameState Machine\n(Sub-Millisecond Event Loop)"]
    Gateway <--> Prisma["Prisma ORM Client"]
    Prisma <--> NeonDB[("Neon Cloud PostgreSQL\n(SSL Pooled + Direct URL)")]
```

### Architectural Decisions & Rationale:
1. **Node.js + Socket.io (over HTTP Polling / Serverless)**:
   - Synchronized multiplayer quizzes require sub-100ms event delivery and persistent bi-directional channels. Serverless functions introduce severe cold starts and cannot maintain stateful TCP timers for 50 simultaneous participants.
2. **In-Memory State Machine backed by PostgreSQL**:
   - Active rounds execute entirely in Node.js server memory (`activeRooms` Map) for sub-millisecond timer resolution and answer locking.
   - Long-term records (users, questions, game sessions, player scores, college league standings) are asynchronously committed to **PostgreSQL via Prisma ORM** for ACID durability.
3. **React + Vite + Tailwind CSS**:
   - Lightning-fast hot module replacement, optimized production bundle size (sub-300kB), and rich responsive dark-mode aesthetics utilizing fluid gradients and micro-animations.

---

## 4. What We Added (Innovation Highlights)

### 🧠 1. Replay Intelligence: Mistake-to-Mastery Engine
Unlike conventional quiz platforms that simply show a score, AptiQuiz performs an automated post-game cognitive review:
- **High-Risk Weak Topic Detection**: Automatically flags sub-topics where a student fails $\ge 2$ questions (e.g., *Probability*, *Time & Work*, *Syllogisms*) and delivers tailored elimination heuristics.
- **Behavioral Pacing Insights**:
  - *Impulsive Rush Error*: Detected when an incorrect answer is locked in under 3.5 seconds.
  - *Concept Hesitation Stall*: Flagged when a player spends $>15$ seconds wrestling with a question.
- **Step-by-Step Mastery Cards**: Side-by-side comparison of the student's submission vs. the correct answer with full explanatory derivations.

### 🏛️ 2. College League Standings
Transforms individual practice into campus-wide pride:
- Automatically maps students to their university domain (`iitb.ac.in`, `bits-pilani.ac.in`, etc.).
- Accumulates match points into global institutional standings.
- Displays top student contributors representing each college.

---

## 5. How to Run It

### Prerequisites
- **Node.js** v18+ (tested on v24)
- **npm** v9+

### Quick Start (Single Command)
1. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/your-username/AptiQuiz.git
   cd AptiQuiz
   npm run install:all
   ```

2. **Environment Configuration**:
   The backend includes a pre-configured Neon PostgreSQL connection in `server/.env`.
   A template is provided in `server/.env.example`:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
   DATABASE_URL_UNPOOLED="postgresql://user:password@host:port/dbname?sslmode=require"
   CLIENT_ORIGIN="http://localhost:5173"
   ```

3. **Start Frontend & Backend Concurrently**:
   ```bash
   npm run dev
   ```
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend API & WebSockets**: [http://localhost:5000](http://localhost:5000)

4. **Run the 50-Player Concurrent Bot Simulation**:
   ```bash
   npm run simulate:50
   ```
   *Spawns 50 virtual bots, creates a room, verifies capacity limits, submits synchronized answers, and logs latency benchmarks.*

---

## 6. Tools and AI Used
- **Antigravity AI Agent**: Architecture design, iterative pair-programming, schema migration, and testing orchestration.
- **Runtime & Backend**: Node.js, Express.js, Socket.io, Prisma ORM, Zod.
- **Database**: Neon Cloud PostgreSQL (Serverless Postgres with SSL).
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Canvas Confetti.

---

## 7. Who It Is For
- **Final-Year & Pre-Final College Students**: Seeking high-pressure, gamified aptitude practice for upcoming campus recruitment tests (TCS, Infosys, Amazon, Cognizant, etc.).
- **Placement Cell Officers & Technical Trainers**: Hosting structured batch assessment rounds with synchronized timers, anti-cheat security, and instant performance leaderboards.
