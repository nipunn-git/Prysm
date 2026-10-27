"""
PromptHub AI Chatbot API – Powered by Gemini
Supports multi-turn conversation with tool-calling semantics:
 - answer prompt engineering questions
 - generate new prompts & create repos
 - optimize existing prompts
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
import models
import schemas
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/chat", tags=["chat"])

DEFAULT_USER_ID = "usr_nipun_01"

# ─── Request / Response Models ─────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: Optional[str] = None
    mode: Optional[str] = "Auto"
    create_repo: Optional[bool] = False  # If True, also create a repo from the last AI prompt
    visibility: Optional[str] = "Public"

class ChatResponse(BaseModel):
    reply: str
    repo_created: Optional[dict] = None  # If a repo was created, include its info
    suggested_actions: Optional[List[str]] = None


# ─── System Prompt for the Chatbot ──────────────────────────────────────
CHATBOT_SYSTEM_PROMPT = """You are **Prysm**, the elite AI Assistant on PromptHub.
You specialize in Prompt Engineering, Software Engineering, Architecture, and Creative Ideation.

## Core Capabilities
1. **Prompt Engineering & Architecture** – Craft production-grade system prompts, few-shot templates, and chain-of-thought protocols.
2. **Code Specialization** – Write complete, runnable, production-quality code, components, scripts, algorithms, and bug fixes across all major languages (Python, TypeScript, JavaScript, Rust, Go, SQL, etc.).
3. **Creative Ideation** – Generate snappy hooks, imaginative concepts, and high-impact angles.
4. **Repository Creation** – Generate structured repositories for reusable prompts and code snippets.

## Response Guidelines
- When code is requested (especially in Code Specialist mode), PROVIDE FULL, RUNNABLE CODE in proper code blocks (e.g. ```python, ```typescript, ```javascript). Explain edge cases, complexities, and usage clearly.
- When a prompt is requested (especially in Prompt Architect mode), generate a complete system prompt wrapped in triple backticks with 'prompt' tag.
- When in Fast Creative mode, be punchy, imaginative, and bold with zero fluff.
- For normal conversations, casual questions, and greetings, be warm, concise, and helpful.

## Repo Creation Rules
Only include a <repo_meta> block at the very end when generating a complete, reusable prompt template or functional code block that makes sense as a persistent repository:
<repo_meta>
{"repo_name": "kebab-case-name", "description": "Short description", "category": "Coding|Productivity|Education|Research|Writing|Other", "prompt_content": "The full prompt or code text"}
</repo_meta>

CRITICAL RESTRICTION:
- NEVER EVER include <repo_meta> for normal conversation, greetings ("hi", "hello"), clarifying questions, definitions, or casual chit-chat.
- If the response does not contain a savable prompt or code artifact, omit <repo_meta> completely.
"""


def call_gemini_chat(messages: List[dict], system_prompt: str) -> str:
    """Call Gemini API with chat history."""
    load_dotenv(override=True)
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if not gemini_key or not gemini_key.strip():
        return fallback_response(messages)
    
    for model_name in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            
            model = genai.GenerativeModel(
                model_name,
                system_instruction=system_prompt
            )
            
            # Convert messages to Gemini format
            gemini_history = []
            for msg in messages[:-1]:  # All except the last message
                role = "user" if msg["role"] == "user" else "model"
                gemini_history.append({"role": role, "parts": [msg["content"]]})
            
            chat = model.start_chat(history=gemini_history)
            
            # Send the last user message
            last_msg = messages[-1]["content"] if messages else "Hello"
            response = chat.send_message(last_msg)
            
            print(f"[PromptHub AI Chat] Successfully got response from {model_name}")
            return response.text
            
        except Exception as e:
            print(f"[PromptHub AI Chat] {model_name} error: {e}")
            continue
    
    return fallback_response(messages)


def fallback_response(messages: List[dict]) -> str:
    """Intelligent fallback when no API is available."""
    last_msg = messages[-1]["content"].lower() if messages else ""
    
    if any(k in last_msg for k in ["create", "draft", "generate", "make", "build", "write"]):
        # Extract what they want
        topic = messages[-1]["content"]
        return f"""## 🎯 Here's your production-ready prompt:

```prompt
# System Prompt: AI Assistant

You are an expert AI specialist designed for: **{topic}**

### Role & Persona
- You operate as an elite subject matter expert with deep contextual understanding.
- Tone: Professional, structured, direct, and actionable.

### Primary Objective
Execute the following mission with maximum precision:
> **{topic}**

### Step-by-Step Execution Protocol
1. **Context & Requirement Ingestion**: Analyze input constraints and requirements.
2. **Deconstruction & Planning**: Break down tasks into clear, logical milestones.
3. **Execution & Synthesis**: Deliver the highest quality output.
4. **Validation & Edge Checking**: Verify accuracy and completeness.

### Constraints
- Zero hallucination – omit speculative claims.
- Prioritize conciseness and signal-to-noise ratio.
- Explicitly highlight edge cases or caveats.

### Output Format
- Clean Markdown hierarchy with headings
- Bullet points for actionable items
- Code blocks where applicable
```

I've generated a production-ready prompt for you! You can:
- **Save it** as a new repository using the save button
- **Edit** it further by telling me what to change
- **Optimize** it by asking me to improve specific sections

<repo_meta>
{{"repo_name": "ai-assistant-prompt", "description": "AI prompt for: {topic}", "category": "Productivity", "prompt_content": "You are an expert AI specialist designed for: {topic}..."}}
</repo_meta>"""
    
    elif any(k in last_msg for k in ["optimize", "improve", "better", "enhance", "refine"]):
        return """## 🔧 Prompt Optimization Tips

To optimize your prompt, I recommend:

1. **Add explicit role definition** – Start with "You are a [specific expert role]..."
2. **Define clear constraints** – What should the AI NOT do?
3. **Specify output format** – JSON, Markdown, bullet points, etc.
4. **Add few-shot examples** – Show the AI what good output looks like
5. **Include negative examples** – Show what to avoid

Share your prompt and I'll optimize it for you!"""
    
    elif any(k in last_msg for k in ["hello", "hi", "hey", "sup", "what can you do"]):
        return """## 👋 Welcome to Prysm!

I'm your AI-powered prompt engineering assistant. Here's what I can do:

🎯 **Create Prompts** – Tell me what you need and I'll generate a production-ready system prompt
🔧 **Optimize Prompts** – Share an existing prompt and I'll improve it
📚 **Teach Techniques** – Ask about CoT, Few-Shot, ReAct, and other prompting techniques
💾 **Create Repos** – I can save your prompts directly to a new private repository

Try asking me something like:
- *"Create a prompt for a code review assistant"*
- *"What's the difference between CoT and Tree-of-Thought?"*
- *"Optimize this prompt: You are a helpful assistant..."*"""
    
    else:
        return f"""I'd be happy to help with that! Here are a few things I can assist with:

1. **Generate a prompt** for your specific use case
2. **Optimize an existing prompt** you have
3. **Explain prompt engineering techniques**
4. **Create a repository** to save your prompts

What would you like to do?"""


def extract_repo_meta(text: str) -> Optional[dict]:
    """Extract repo metadata from AI response if present."""
    pattern = r'<repo_meta>\s*(\{.*?\})\s*</repo_meta>'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            return None
    return None


def clean_response(text: str) -> str:
    """Remove repo_meta tags from the response for clean display."""
    return re.sub(r'<repo_meta>.*?</repo_meta>', '', text, flags=re.DOTALL).strip()


def sanitize_repo_name(raw: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", "", raw).strip().lower()
    cleaned = re.sub(r"[\s_]+", "-", cleaned)
    parts = cleaned.split("-")[:5]
    result = "-".join(parts)
    return result if result else "ai-prompt"


# ─── Main Chat Endpoint ────────────────────────────────────────────────
@router.post("", response_model=ChatResponse)
def chat_with_ai(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    user_id = request.user_id or DEFAULT_USER_ID
    
    # Convert to dict format for the AI
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")
    
    # Fetch user's repos and their latest prompts to give AI context
    user_repos = db.query(models.Repository).filter(models.Repository.owner_id == user_id).all()
    user_context = "## User's Repositories Context\nThe user has the following repositories and prompts:\n"
    if user_repos:
        for repo in user_repos:
            latest_version = db.query(models.PromptVersion).filter(
                models.PromptVersion.repository_id == repo.id
            ).order_by(models.PromptVersion.created_at.desc()).first()
            prompt_content = latest_version.content if latest_version else "No prompt content"
            # Truncate content to avoid token overflow
            prompt_content = prompt_content[:800] + ("..." if len(prompt_content) > 800 else "")
            user_context += f"- Repo: {repo.name} | Category: {repo.category}\n  Content: {prompt_content}\n\n"
    else:
        user_context += "The user currently has no repositories.\n"
        
    mode_instructions = {
        "Code Specialist": (
            "## PRIMARY ROLE: YOU ARE PRYSM (CODE SPECIALIST)\n"
            "You are an elite Senior Staff Software Engineer and Master Programmer on PromptHub.\n"
            "MANDATORY DIRECTIVE: When the user asks for code, functions, scripts, algorithms, components, or debugging: DO NOT WRITE A META-PROMPT. YOU MUST DIRECTLY WRITE AND DELIVER THE ACTUAL RUNNABLE CODE! Write complete, production-ready code in language-tagged markdown code blocks (e.g. ```python, ```typescript, ```javascript, ```sql, etc.). Explain the code clearly. You can output a <repo_meta> tag with category 'Coding' when writing complete code files.\n"
        ),
        "Fast Creative": (
            "## PRIMARY ROLE: YOU ARE PRYSM (FAST CREATIVE)\n"
            "You are a high-velocity, imaginative prompt ideation engine and creative powerhouse.\n"
            "MANDATORY DIRECTIVE: Deliver snappy hooks, viral concepts, and inventive prompt variations with high energy, bold angles, and zero filler or corporate fluff.\n"
        ),
        "Prompt Architect": (
            "## PRIMARY ROLE: YOU ARE PRYSM (PROMPT ARCHITECT)\n"
            "You are a World-Class Prompt Engineer and AI System Architect.\n"
            "MANDATORY DIRECTIVE: Construct industrial-strength system prompts with Role, Objective, Step-by-Step Execution Protocol, Constraints, and Output Format in ```prompt code blocks.\n"
        ),
        "Auto": (
            "## PRIMARY ROLE: YOU ARE PRYSM (INTELLIGENT ADAPTIVE AI)\n"
            "MANDATORY DIRECTIVE: Automatically detect what the user needs:\n"
            "- If the user asks for CODE or technical implementation (e.g. 'write a python function...', 'create a react hook...'): DIRECTLY WRITE THE CODE in ```language code blocks! Do not write a prompt to generate code.\n"
            "- If the user asks for a PROMPT: Construct a production-grade prompt in a ```prompt block.\n"
            "- If the user asks for creative ideas: Be fast and creative.\n"
            "- If the user engages in normal conversation, greetings, or casual talk: Answer naturally and concisely. NEVER include <repo_meta> for casual chat.\n"
        )
    }
    active_mode = request.mode or "Auto"
    mode_prompt = mode_instructions.get(active_mode, mode_instructions["Auto"])
    dynamic_system_prompt = f"{mode_prompt}\n\n{CHATBOT_SYSTEM_PROMPT}\n\n{user_context}"
    
    # Call Gemini
    raw_reply = call_gemini_chat(messages, dynamic_system_prompt)
    
    # Extract repo metadata if present
    repo_meta = extract_repo_meta(raw_reply)
    clean_reply = clean_response(raw_reply)
    
    repo_created = None
    
    # If user asked to create repo OR AI included repo metadata
    if request.create_repo and repo_meta:
        try:
            base_name = sanitize_repo_name(repo_meta.get("repo_name", "ai-prompt"))
            final_name = base_name
            count = 1
            while db.query(models.Repository).filter(
                models.Repository.owner_id == user_id,
                models.Repository.name == final_name
            ).first():
                final_name = f"{base_name}-{count}"
                count += 1
            
            visibility = request.visibility or "Private"
            owner = db.query(models.User).filter(models.User.id == user_id).first()
            if owner and final_name.lower() == owner.username.lower():
                visibility = "Private"
                
            new_repo = models.Repository(
                owner_id=user_id,
                name=final_name,
                description=repo_meta.get("description", "AI-generated prompt repository"),
                category=repo_meta.get("category", "Productivity"),
                visibility=visibility
            )
            db.add(new_repo)
            db.commit()
            db.refresh(new_repo)
            
            # Create initial version
            prompt_content = repo_meta.get("prompt_content", clean_reply)
            first_version = models.PromptVersion(
                repository_id=new_repo.id,
                version="v1.0",
                content=prompt_content,
                change_description="Initial prompt created by PromptHub AI Chat"
            )
            db.add(first_version)
            db.commit()
            db.refresh(new_repo)
            
            owner = db.query(models.User).filter(models.User.id == user_id).first()
            
            repo_created = {
                "id": new_repo.id,
                "name": new_repo.name,
                "description": new_repo.description,
                "category": new_repo.category,
                "visibility": new_repo.visibility,
                "owner_name": owner.name if owner else "User",
                "owner_avatar": owner.avatar if owner else None,
                "versions_count": 1,
                "latest_version": "v1.0"
            }
            
            print(f"[PromptHub AI Chat] Created repo '{final_name}' for user {user_id}")
            
        except Exception as e:
            print(f"[PromptHub AI Chat] Failed to create repo: {e}")
    
    # Suggest follow-up actions
    suggested = []
    if repo_meta and not request.create_repo:
        suggested.append("save_as_repo")
    if "```prompt" in raw_reply or "```" in raw_reply:
        suggested.append("copy_prompt")
        suggested.append("optimize")
    suggested.append("continue_chat")
    
    return ChatResponse(
        reply=clean_reply,
        repo_created=repo_created,
        suggested_actions=suggested
    )


# ─── Quick Generate Endpoint (for one-shot prompt creation) ────────────
@router.post("/quick-generate")
def quick_generate(
    payload: schemas.AICreateRepoRequest,
    db: Session = Depends(get_db)
):
    """Quick one-shot: user describes what they want → AI generates prompt → creates private repo."""
    user_id = payload.user_id or DEFAULT_USER_ID
    
    messages = [
        {"role": "user", "content": f"Create a production-ready {payload.action_type or 'system'} prompt for: {payload.query}. Include all sections: Role, Objective, Workflow, Constraints, and Output Format. Make it comprehensive and ready to use."}
    ]
    
    raw_reply = call_gemini_chat(messages, CHATBOT_SYSTEM_PROMPT)
    repo_meta = extract_repo_meta(raw_reply)
    clean_reply = clean_response(raw_reply)
    
    # Extract prompt content from code blocks if present
    prompt_content = clean_reply
    code_block_match = re.search(r'```(?:prompt|markdown|)?\n(.*?)```', clean_reply, re.DOTALL)
    if code_block_match:
        prompt_content = code_block_match.group(1).strip()
    
    # Use repo_meta if available, otherwise infer
    if repo_meta:
        repo_name = sanitize_repo_name(repo_meta.get("repo_name", payload.query))
        description = repo_meta.get("description", f"AI prompt for: {payload.query}")
        category = repo_meta.get("category", "Productivity")
        if repo_meta.get("prompt_content"):
            prompt_content = repo_meta["prompt_content"]
    else:
        repo_name = sanitize_repo_name(payload.query)
        description = f"AI prompt for: {payload.query}"
        # Infer category
        q_lower = payload.query.lower()
        if any(k in q_lower for k in ["code", "sql", "bug", "python", "js", "react", "api"]):
            category = "Coding"
        elif any(k in q_lower for k in ["research", "paper", "study", "analysis"]):
            category = "Research"
        elif any(k in q_lower for k in ["teach", "tutor", "learn", "course"]):
            category = "Education"
        elif any(k in q_lower for k in ["write", "essay", "blog", "copy", "email"]):
            category = "Writing"
        else:
            category = "Productivity"
    
    # Deduplicate repo name
    final_name = repo_name
    count = 1
    while db.query(models.Repository).filter(
        models.Repository.owner_id == user_id,
        models.Repository.name == final_name
    ).first():
        final_name = f"{repo_name}-{count}"
        count += 1
    
    visibility = payload.visibility or "Public"
    owner = db.query(models.User).filter(models.User.id == user_id).first()
    if owner and final_name.lower() == owner.username.lower():
        visibility = "Private"
        
    new_repo = models.Repository(
        owner_id=user_id,
        name=final_name,
        description=description,
        category=category,
        visibility=visibility
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)
    
    first_version = models.PromptVersion(
        repository_id=new_repo.id,
        version="v1.0",
        content=prompt_content,
        change_description=f"Initial prompt created by PromptHub AI ({payload.action_type or 'custom'})"
    )
    db.add(first_version)
    db.commit()
    db.refresh(new_repo)
    
    owner = db.query(models.User).filter(models.User.id == user_id).first()
    
    return {
        "id": new_repo.id,
        "name": new_repo.name,
        "description": description,
        "category": category,
        "visibility": new_repo.visibility,
        "owner_id": new_repo.owner_id,
        "owner_name": owner.name if owner else "Nipun",
        "owner_avatar": owner.avatar if owner else None,
        "created_at": new_repo.created_at.isoformat(),
        "updated_at": new_repo.updated_at.isoformat(),
        "versions_count": 1,
        "latest_version": "v1.0",
        "latest_prompt": prompt_content,
        "ai_explanation": clean_reply
    }
