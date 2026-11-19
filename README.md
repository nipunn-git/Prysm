<div align="center">

<img src="./frontend/public/logo.png" alt="Prysm Logo" width="105" height="105" />

# PRYSM
### *The GitHub for AI Prompts & LLM Engineering Workflows*

<p align="center">
  <b>Version Control, Forking, Branching, Community Social Feed, and Multi-LLM Prompt Optimization.</b>
</p>

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live-black?style=for-the-badge&logo=vercel&logoColor=white)](https://prysm-social.vercel.app)
[![Render Backend](https://img.shields.io/badge/Render-Backend%20Live-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://prompthub-backend-ifv8.onrender.com)
[![Next.js](https://img.shields.io/badge/Next.js%2014-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br/>

[🚀 **Explore Live App**](https://prysm-social.vercel.app) • [📖 **API Documentation**](https://prompthub-backend-ifv8.onrender.com/docs) • [✨ **Features**](#-features--superpowers) • [🛠️ **Quick Start**](#-getting-started) • [👥 **Contributors**](#-contributors)

</div>

---

## 🌌 Overview

**Prysm** redefines prompt engineering from scratch. Just as **GitHub** transformed source code management, **Prysm** brings true **Git-style version control, side-by-side prompt diffing, semantic release commits, forking, branching, and open community sharing** to LLM system instructions, agent workflows, and prompt engineering.

Crafted with an **Apple-inspired glassmorphism design system**, instant optimistic updates (0ms lag), real-time notifications, interactive contribution heatmaps, and native multi-model AI optimization (OpenAI, Google Gemini, Groq), Prysm is built for AI engineers, researchers, and prompt creators.

---

## ✨ Features & Superpowers

### 🌿 1. Git-Style Version Control for AI Prompts
- **Commit History & Semantic Versioning**: Commit iterative changes to your system prompts with descriptive messages, author signatures, and SHA-1 checksum tracking.
- **Side-by-Side Diff Comparison**: Inspect additions (`+`), deletions (`-`), and modifications between any two historical versions in real-time.
- **Rollback & Version Branching**: Instantly view historical prompts and inspect previous revisions without losing version integrity.
- **Granular Visibility**: Mark prompts as **Public** to share with the community or **Private** for confidential development.

### 🔀 2. Instant Forking & Remix Ecosystem
- **One-Click Forking**: Duplicate any community prompt into your personal workspace with automated upstream author attribution.
- **Non-Destructive Experimentation**: Tweak, enhance, and branch off other creators' prompts freely without altering the original.

### 📰 3. Social Feed & Community Stream
- **Continuous Stream Feed**: Explore trending, latest, and category-filtered prompts in a distraction-free, Apple-glass feed layout.
- **Optimistic Heart Likes**: 0ms instant UI reactions with synchronous backend sync and live like counts.
- **Suggested Creators**: Discover top creators across AI domains with one-click follow.
- **Direct Copy & Optimization**: One-click prompt clipboard copy and instant dispatch to the studio for AI refinement.

### 🎨 4. Apple Glassmorphic UI & 7 Pro Color Themes
- **SF Pro Typography & Motion Design**: Built with smooth fluid springs (`Framer Motion`), backdrop blur filters, and micro-interactions.
- **Ambient Canvas**: Real-time interactive `GridPulse` canvas background with fluid cursor lighting.
- **7 Contrast-Engineered Themes**:
  - 🟣 **Dark**: *Default Dark, Dimmed Dark, High Contrast Dark, Colorblind Dark*
  - ☀️ **Light**: *Default Light, High Contrast Light, Colorblind Light*

### 🤖 5. Prysm AI Studio & Multi-Model Engine
- **Intelligent Prompt Optimizer**: Refine token efficiency, system clarity, edge-case coverage, and prompt structure.
- **Multi-Provider LLM Integration**: Powered interchangeably by **Google Gemini**, **Groq (Llama 3)**, and **OpenAI**.
- **Voice Speech-to-Text Input**: Dictate prompt ideas seamlessly via native browser speech recognition.
- **Interactive Multi-Turn Chat Playground**: Test, benchmark, and chat with prompts live before committing.

### 👤 6. Developer Profiles & 52-Week Heatmap
- **Contribution Graph**: Track your daily prompt commits and repo creations with a GitHub-style 52-week activity heatmap.
- **Special Profile README (`username/username`)**: Custom Markdown bio repository that renders on public profiles, with automatic GitHub sync.
- **Social Graph**: Follow creators, grow followers, and inspect follower/following directories with smooth popup modals.

### 🔔 7. Real-Time Notification Center
- Instant toast and dropdown notifications whenever someone **follows you**, **likes your prompt**, or **forks your work**.
- Unread badge counters, mark-all-as-read, and fast background synchronization.

### 🔍 8. Instant Command Palette (`/` & `ESC`)
- Spotlight-style keyboard search palette (`/`) with 0ms instant cached matching across creators, handles, prompt names, and categories.

---

## 🏗️ Architecture & Technology Stack

```
                          ┌────────────────────────────┐
                          │   Next.js 14 (App Router)  │
                          │   Tailwind CSS + SF Pro    │
                          │   Framer Motion + Three.js │
                          └─────────────┬──────────────┘
                                        │ HTTPS / REST API
                                        ▼
                          ┌────────────────────────────┐
                          │     FastAPI (Python 3.11)  │
                          │  Pydantic + SQLAlchemy ORM │
                          └─────────────┬──────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
│     Firebase Auth     │    │   Database Storage    │    │    Multi-Model AI     │
│  Identity & Security  │    │  PostgreSQL / SQLite  │    │ Gemini · Groq · OpenAI│
└───────────────────────┘    └───────────────────────┘    └───────────────────────┘
```

### Frontend Stack
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, React Server Components)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) with custom Apple glassmorphism utilities
- **Motion & 3D**: [Framer Motion](https://www.framer.com/motion/), [Three.js](https://threejs.org/) for ambient mesh
- **Icons & Markdown**: [Lucide React](https://lucide.dev/), `react-markdown`, `remark-gfm`, `rehype-raw`
- **Auth SDK**: [Firebase Authentication](https://firebase.google.com/docs/auth)

### Backend Stack
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous, High-Performance)
- **Database & ORM**: [SQLAlchemy](https://www.sqlalchemy.org/) with SQLite (local) and PostgreSQL (production via `pg8000`)
- **LLM Integrations**:
  - `google-generativeai` (Google Gemini 1.5 Flash / Pro)
  - `groq` (Groq Ultra-Low Latency Llama 3)
  - `openai` (GPT-4o / GPT-3.5)
- **Auth Verification**: `firebase-admin` JWT token validation

---

## 📁 Repository Structure

```
Prysm/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routes (auth, repos, prompts, notifications, ai)
│   │   ├── models/          # SQLAlchemy database models
│   │   ├── schemas/         # Pydantic data validation schemas
│   │   ├── services/        # AI engines, Firebase auth, version control logic
│   │   └── core/            # Configuration, database connection, security
│   ├── main.py              # Application entrypoint
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── app/
│   │   ├── dashboard/       # Prysm AI Studio (Chat, Optimizer, Voice, Playground)
│   │   ├── explore/         # Social Community Feed (Filters, Suggestions, Likes)
│   │   ├── repo/[id]/       # Prompt Repository (Code, Commits, Diff Compare, Settings)
│   │   ├── profile/         # Authenticated User Profile (Heatmap, Special README)
│   │   ├── u/[username]/    # Public Creator Profile (Follow, Share, Social graph)
│   │   ├── new/             # Create New Repository
│   │   ├── login/ & join/   # Authentication pages
│   │   ├── globals.css      # Theme definitions, SF Pro fonts, glassmorphism
│   │   └── layout.jsx       # Global Root Layout with pre-hydration theme script
│   ├── components/          # Reusable UI components (Navbar, Modals, Ambient Pulse)
│   ├── context/             # AuthContext, ThemeContext
│   └── lib/                 # API client, 0ms cache store, repoStore
├── run.bat                  # Unified one-click runner for Windows
├── package.json             # Root monorepo configuration
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **Python** v3.9 or higher
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/nipunn-git/Prysm.git
cd Prysm
```

### 2. Frontend Configuration
```bash
cd frontend
npm install
```

Create a `.env.local` inside `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Backend Configuration
```bash
cd ../backend
python -m venv venv

# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```env
SECRET_KEY=your_super_secret_jwt_key
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=sqlite:///./prompthub.db
```

### 4. Run Locally (Unified Command)
From the root project directory:
```bash
npm run dev
```
*(Or simply double-click `run.bat` on Windows!)*

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 Core API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/repositories` | `GET` | List all repositories (with search & category filter params) |
| `/api/repositories` | `POST` | Create a new prompt repository with initial version `v1.0` |
| `/api/repositories/{id}` | `GET` | Retrieve complete repository details, prompt code & tags |
| `/api/repositories/{id}/commits` | `GET` / `POST` | Fetch commit history or commit a new prompt version |
| `/api/repositories/{id}/star` | `POST` | Optimistically like or unlike a repository |
| `/api/repositories/{id}/fork` | `POST` | Fork repository into the caller's workspace |
| `/api/ai/optimize` | `POST` | Optimize and structure prompt via multi-model AI |
| `/api/ai/chat` | `POST` | Multi-turn streaming chat evaluation for system prompts |
| `/api/auth/users/{id}/follow` | `POST` | Follow or unfollow a user |
| `/api/notifications` | `GET` / `DELETE`| Fetch or clear user activity notifications |

---

## 👥 Contributors

This project is conceived, architected, and engineered with ❤️ by:

<div align="center">
  <table>
    <tr>
      <td align="center">
        <a href="https://github.com/nipunn-git">
          <img src="https://github.com/nipunn-git.png" width="115px;" alt="Nipun Dhiman" style="border-radius: 50%; box-shadow: 0 4px 20px rgba(0,0,0,0.25);"/><br />
          <sub><b style="font-size: 14px;">Nipun Dhiman</b></sub>
        </a><br />
        <span>🚀 <b>Creator & Lead Architect</b></span><br />
        <a href="https://github.com/nipunn-git" title="GitHub">🐙 GitHub (@nipunn-git)</a> • 
        <a href="mailto:nipunndhiman@gmail.com" title="Email">✉️ Email</a>
      </td>
    </tr>
  </table>
</div>

---

## 📜 License

This project is open-source and available under the **[MIT License](LICENSE)**.

<div align="center">
  
  <br/>
  <b>© 2026 Prysm. All rights reserved.</b>
</div>
