# <img src="https://img.shields.io/badge/💬-Coddite-blue?style=flat-square" alt="Coddite"> Coddite

<div align="center">
---

## 👥 Team

Developed as a **modern, anonymous community platform** combining expertise in full-stack engineering, real-time systems, and AI-powered moderation.


---

<h3>⚡ Anonymous Coding Community for Students & Developers</h3>

<p><em>From fear of asking questions to open, identity-free collaboration — build knowledge without the judgment.</em></p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)

<br/>

> **Coddite** is an end-to-end Reddit-style platform where developers share posts, ask questions, and help each other — all under **anonymous, auto-generated handles**. Real identity is never exposed, backed by real-time notifications, strict privacy filters, and an AI moderation engine.

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Trust & Safety Pipeline](#-trust--safety-pipeline)
- [Karma & Reputation Engine](#-karma--reputation-engine)
- [Vector Similarity Search](#-vector-similarity-search)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Platform Views](#-platform-views)
- [Real-Time Notifications](#-real-time-notifications)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Example API Output](#-example-api-output)
- [Future Roadmap](#-future-roadmap)

---

## ⚡ Problem Statement

Developer communities like StackOverflow or LinkedIn tie questions directly to professional identities. This creates a highly judgmental environment where students and junior developers are afraid to ask "dumb" questions, fearing it might impact their future careers or peer perception. 

| Challenge | Impact |
|---|---|
| 🔴 Professional Identity Ties | Fear of asking beginner questions |
| 🔴 Toxic Behavior | Gatekeeping and unhelpful elitism |
| 🔴 Information Silos | Hard to find similar previously-answered questions |
| 🔴 Delayed Feedback | Static forums lack real-time engagement |

**Coddite** solves this by strictly enforcing **anonymity**, implementing a dynamic **karma economy**, and using **AI-powered toxicity filtering** to keep the community healthy and instantly responsive.

---

## 🚀 Key Features

### 🎭 Absolute Anonymity
Users sign up with an email (for verification), but the system generates a unique, opaque `handle` (e.g., `user_8f7b2a`). Real emails and identities are never exposed to the public frontend.

### 📈 Karma & Reputation System
Upvotes and downvotes dynamically adjust a user's `karma`. Reaching karma milestones unlocks privileges (e.g., posting images/links), while low karma flags users for shadowbanning or moderation.

### 💬 Real-Time WebSockets
Socket.IO powers instant UI updates. When someone comments on your post or replies to your thread, the notification bell updates live without a page refresh.

### 🛡️ AI Content Moderation & Queue
Machine Learning (Toxicity evaluations) intercept posts. Highly toxic content is auto-hidden and sent to a **Moderation Queue**, where community moderators review, approve, or reject it.

### 🔍 Semantic Vector Search
Integrated `pgvector` allows for semantic search. Instead of just keyword matching, the ML microservice generates embeddings to find "similar questions" contextually.

### 🚫 Block & Privacy Controls
Granular privacy controls. Users can block bad actors (hiding their content instantly via one-way blocks) and configure fine-grained notification preferences.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Coddite React Frontend                     │
│    (Tailwind CSS · Context API · Axios · Socket.IO Client)  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js / Express Backend                  │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │   Auth   │  │  Posts/  │  │   Real-  │  │  Mod     │  │
│   │ (JWT/OTP)│  │  Votes   │  │   Time   │  │  Queue   │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└────────┼─────────────┼─────────────┼─────────────┼────────┘
         │             │             │             │
         ▼             ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐
│  PostgreSQL  │ │  Redis   │ │   BullMQ   │ │   Python   │
│ (pgvector +  │ │ (Caching │ │ (Background│ │  ML Micro- │
│  Prisma ORM) │ │  Pub/Sub)│ │  Workers)  │ │   service  │
└──────────────┘ └──────────┘ └────────────┘ └────────────┘
```

---

## 🛡️ Trust & Safety Pipeline

### Automated Moderation

Coddite uses a multi-layered approach to handle toxic content and spam:

| Layer | Mechanism | Action |
|---|---|---|
| **Rate Limiting** | Redis-backed token bucket | Blocks API spam |
| **Toxicity ML** | NLP heuristic/LLM analysis | Flags abusive language |
| **Karma Thresholds**| Reputation tracking | Restricts new/abusive accounts |
| **Human Review** | Moderation Dashboard | Final say on flagged content |

### Toxicity Scoring

```
Score >= 0.85 → Auto-hide post, send to Mod Queue
Score >= 0.50 → Allow post, but flag for soft review
Score < 0.50  → Auto-approve
```

---

## ⚖️ Karma & Reputation Engine

Karma isn't just a number; it dictates access and trust across the platform.

```
Total_Karma = (Upvotes × 1.0) - (Downvotes × 1.5) + (Awards × 10)
```

**Milestones:**
- `< 0` : Restricted posting rate
- `>= 10`: Unlocks ability to embed images and external links
- `>= 100`: Unlocks ability to create private communities

---

## 🔍 Vector Similarity Search

Raw text is transformed into **768-dimensional embeddings** to power semantic search.

### Search Pipeline
1. User types query: *"How do I fix CORS in Express?"*
2. **Python ML Service** converts query to vector embedding.
3. **pgvector** executes a Cosine Similarity (`<=>`) search against the database.
4. Returns relevant posts even if they use different words (e.g., *"Cross-Origin errors in Node"*).

---

## 💻 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React.js 18 / Vite** | Extremely fast UI rendering and build tooling |
| **Tailwind CSS** | Utility-first styling and dark mode |
| **Socket.IO Client** | Real-time events |
| **Lucide React** | Consistent, crisp iconography |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | High-performance REST API |
| **Prisma ORM** | Type-safe database access |
| **PostgreSQL** | Primary relational datastore |
| **Redis & BullMQ** | Caching, session management, and job queues |
| **Resend (SMTP)** | Email delivery for OTPs |

### Machine Learning
| Technology | Purpose |
|---|---|
| **Python 3.10+** | Microservice runtime |
| **pgvector** | Vector similarity extensions in Postgres |
| **scikit-learn / NLP**| Toxicity evaluation and text classification |

---

## 📂 Project Structure

```text
coddite/
├── backend/
│   ├── config/               # Environment and constants
│   ├── prisma/               # Schema and migrations
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # JWT Auth, Rate Limiting, RBAC
│   │   ├── modules/          # Domain logic (posts, comments, users)
│   │   ├── processors/       # BullMQ job handlers
│   │   └── server.js         # API Entry point
│   └── tests/                # Vitest API test suite (92 tests)
│
├── frontend/
│   ├── src/
│   │   ├── components/       # UI Components (auth, home, posts)
│   │   ├── context/          # Global React state (Auth, Sockets)
│   │   └── lib/              # Axios instance and utilities
│   └── vite.config.js
│
├── ml/                       # Python inference API (Toxicity/Tags)
├── shared/                   # Monorepo shared schemas/types
├── docs/                     # ADRs and Architecture specs
└── render.yaml               # Infrastructure as Code
```

---

## 📊 Platform Views

| View | Description |
|---|---|
| **Auth Gateway** | Secure OTP and Password login with strict rate limits |
| **Global Feed** | Chronological and Top-ranked algorithmic feeds |
| **Community Detail** | Dedicated spaces with localized rules and moderators |
| **Post Thread** | Nested comment trees with Reddit-style collapsibility |
| **Moderator Dashboard** | Queue management for reported and toxic content |
| **Profile Settings** | Notification preferences and blocked users management |

---

## ⚠ Real-Time Notifications

Socket.IO rooms ensure notifications are pushed instantly. 

Events tracked:
- `NEW_COMMENT` - Someone replied to your post
- `NEW_REPLY` - Someone replied to your comment
- `KARMA_MILESTONE` - You crossed a reputation threshold
- `POST_FLAGGED` - Your post was sent to moderation

---

## 📦 Installation

### Prerequisites

- Node.js `24+`
- pnpm `9+`
- Docker (for Postgres/Redis/Mailpit)

### Clone & Setup

```bash
git clone https://github.com/itatshu/coddite.git
cd coddite
pnpm install
```

### Infrastructure

```bash
docker compose up -d       # Starts Postgres+pgvector, Redis, and Mailpit
```

### Environment Setup

```bash
pnpm secrets:generate      # Generates secure cryptograpic keys
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
*(Populate the `.env` files with the generated keys)*

### Database & Run

```bash
pnpm db:migrate:dev        # Run migrations
pnpm db:seed               # Seed fake communities/posts
pnpm dev                   # Start frontend (5173), backend (4000)
```

---

## 🔧 Environment Variables

```env
# backend/.env
DATABASE_URL=postgresql://coddite:coddite_local_dev@localhost:5432/coddite
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_jwt_secret_here
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_12345...
COOKIE_SECURE=false # Set true in production

# frontend/.env
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
```

---

## 📈 Example API Output

**GET `/api/v1/posts/:id`**
```json
{
  "status": "success",
  "data": {
    "id": "post-xyz",
    "title": "Why does useEffect run twice?",
    "bodyHtml": "<p>I am building a React app and...</p>",
    "upvotes": 42,
    "downvotes": 3,
    "author": {
      "handle": "user_8f7b2a",
      "karma": 156
    },
    "community": {
      "slug": "reactjs",
      "name": "React Developers"
    },
    "bookmarked": true,
    "voteStatus": "UPVOTED",
    "comments": [ ... ]
  }
}
```

---

## 🔮 Future Roadmap

- [ ] **Live Typing Indicators** — For real-time comment threads
- [ ] **OAuth Integration** — Sign in with GitHub/Google
- [ ] **Direct Messaging** — Private, encrypted chats between anonymous handles
- [ ] **Mobile Application** — React Native companion app
- [ ] **Advanced Analytics** — Admin dashboard for community health metrics

---

<div align="center">

**Built to power open knowledge without judgment.**

*Coddite — Ask Anything. Be Anyone.*

</div>
