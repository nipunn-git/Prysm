# PromptHub 🚀

PromptHub is the "GitHub for AI Prompts." It provides a unified platform where users can create, discover, optimize, and manage AI prompts effortlessly. 

## Features

- **Prompt Repositories**: Create and manage repositories tailored to specific tasks or domains for your AI prompts.
- **AI Prompt Optimizer**: Integrated with OpenAI, helping you refine and polish prompts directly within the platform.
- **Collaborative Ecosystem**: Explore, star, and fork public prompts from the community.
- **Chat Interface**: Test your prompts natively via a built-in chat UI before finalizing them.
- **Authentication**: Secure login powered by Firebase.
- **Dashboard**: Track your repositories, usage, and favorites from a beautiful Next.js frontend.

## Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (via SQLAlchemy)
- **AI Integration**: OpenAI API for AI capabilities (Optimization, Chat)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.9 or higher)
- OpenAI API Key (added in `.env`)
- Firebase config (added to your frontend environment)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nipunn-git/academic-PromptHub.git
   cd academic-PromptHub
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```
   Create a `.env.local` file inside `frontend/` with your Firebase credentials.

3. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   Copy `backend/.env.example` to `backend/.env` and add your `OPENAI_API_KEY`.

### Running Locally

We've provided a unified launch script that starts both the Next.js frontend and the FastAPI backend seamlessly!

From the root of the project:
```bash
npm run dev
```
*(Or simply double-click `run.bat` on Windows!)*

The frontend will be available at [http://localhost:3000](http://localhost:3000) and the backend API at [http://localhost:8000](http://localhost:8000).

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## License

This project is licensed under the MIT License.
