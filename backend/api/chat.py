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
2. **Code Specialization** – Write complete, runnable, production-quality code, components, scripts, algorithms, and bug fixes across all major languages (C, Python, TypeScript, JavaScript, Rust, Go, SQL, etc.).
3. **Creative Ideation** – Generate snappy hooks, imaginative concepts, and high-impact angles.
4. **Repository Creation** – Generate structured repositories for reusable prompts and code snippets.

## Response Guidelines (CRITICAL FOR SPEED & CLARITY)
- BE DIRECT, INSTANT, AND HIGH-SIGNAL. Zero corporate filler, zero redundant preamble.
- WHEN CODE IS REQUESTED: PROVIDE THE COMPLETE, RUNNABLE, STANDALONE CODE IN A SINGLE UNIFIED CODE BLOCK (e.g. ```c, ```python, ```typescript). Do NOT fragment or chop up the code into multiple snippets. Follow with a short, crisp explanation (2 to 4 bullet points max) covering only core logic or key edge cases. Do NOT explain standard libraries line-by-line.
- WHEN A PROMPT IS REQUESTED: Generate a complete, production-ready system prompt enclosed in a single ```prompt code block.
- WHEN IN FAST CREATIVE MODE: Deliver punchy, bold angles with high energy and zero fluff.
- FOR CASUAL CHAT / GREETINGS: Respond warmly and concisely in 1 or 2 sentences max.

## Repo Creation Rules
Only include a <repo_meta> block at the very end when generating a complete, reusable prompt template or functional code block that makes sense as a persistent repository:
<repo_meta>
{"repo_name": "kebab-case-name", "description": "Short description", "category": "Coding|Productivity|Education|Research|Writing|Other", "prompt_content": "The COMPLETE runnable code or entire prompt text"}
</repo_meta>

CRITICAL RESTRICTION:
- In "prompt_content", you MUST include the FULL, COMPLETE code or prompt without truncating, omitting, or summarizing.
- NEVER include <repo_meta> for casual chat, greetings ("hi", "hello"), or short Q&A.
- If the response does not contain a savable prompt or code artifact, omit <repo_meta> completely.
"""


def call_gemini_chat(messages: List[dict], system_prompt: str) -> str:
    """Call Gemini API with chat history using ultra-fast Flash models."""
    load_dotenv(override=True)
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if not gemini_key or not gemini_key.strip():
        return fallback_response(messages)
    
    # Modern, fast Gemini models (gemini-2.5-flash is sub-second, gemini-3.8-flash for modern fallback)
    for model_name in ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            
            model = genai.GenerativeModel(
                model_name,
                system_instruction=system_prompt,
                generation_config={
                    "temperature": 0.3,
                    "top_p": 0.95,
                    "max_output_tokens": 2048,
                }
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


def extract_primary_content(text: str) -> str:
    """Extract full prompt or primary runnable code block cleanly from markdown."""
    if not text:
        return ""
    
    # 1. Prefer explicit ```prompt block
    prompt_match = re.search(r'```prompt\s*\n(.*?)```', text, re.DOTALL | re.IGNORECASE)
    if prompt_match and prompt_match.group(1).strip():
        return prompt_match.group(1).strip()
    
    # 2. Extract all code blocks (```python, ```c, ```js, etc.)
    blocks = re.findall(r'```[a-zA-Z0-9_#-]*\s*\n([\s\S]*?)```', text)
    if blocks:
        # Choose the longest code block (which is the actual full program or prompt)
        longest = max(blocks, key=len).strip()
        if len(longest) > 20:
            return longest
            
    # 3. Clean fallback
    return clean_response(text).strip()


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
    
    # Fetch user's recent repos and their latest prompts to give AI context (limit to 5 for speed)
    user_repos = db.query(models.Repository).filter(
        models.Repository.owner_id == user_id
    ).order_by(models.Repository.created_at.desc()).limit(5).all()
    user_context = "## User's Repositories Context\nThe user has the following repositories and prompts:\n"
    if user_repos:
        for repo in user_repos:
            latest_version = db.query(models.PromptVersion).filter(
                models.PromptVersion.repository_id == repo.id
            ).order_by(models.PromptVersion.created_at.desc()).first()
            prompt_content = latest_version.content if latest_version else "No prompt content"
            # Truncate content to avoid token overflow
            prompt_content = prompt_content[:400] + ("..." if len(prompt_content) > 400 else "")
            user_context += f"- Repo: {repo.name} | Category: {repo.category}\n  Content: {prompt_content}\n\n"
    else:
        user_context += "The user currently has no repositories.\n"
        
    mode_instructions = {
        "Code Specialist": (
            "## PRIMARY ROLE: YOU ARE PRYSM (CODE SPECIALIST)\n"
            "You are an elite Senior Staff Software Engineer and Master Programmer on PromptHub.\n"
            "MANDATORY DIRECTIVE: Deliver the complete, production-ready, runnable code in a SINGLE clean code block. Do NOT split the code into small pieces. Keep explanations concise, crisp, and high-signal (2-4 bullet points max) without unnecessary filler or line-by-line syntax lectures.\n"
        ),
        "Fast Creative": (
            "## PRIMARY ROLE: YOU ARE PRYSM (FAST CREATIVE)\n"
            "You are a high-velocity, imaginative prompt ideation engine and creative powerhouse.\n"
            "MANDATORY DIRECTIVE: Deliver snappy hooks, viral concepts, and inventive prompt variations with high energy, bold angles, and zero filler or corporate fluff.\n"
        ),
        "Prompt Architect": (
            "## PRIMARY ROLE: YOU ARE PRYSM (PROMPT ARCHITECT)\n"
            "You are a World-Class Prompt Engineer and AI System Architect.\n"
            "MANDATORY DIRECTIVE: Construct industrial-strength system prompts with Role, Objective, Step-by-Step Execution Protocol, Constraints, and Output Format in a single ```prompt code block.\n"
        ),
        "Auto": (
            "## PRIMARY ROLE: YOU ARE PRYSM (INTELLIGENT ADAPTIVE AI)\n"
            "MANDATORY DIRECTIVE: Automatically detect what the user needs:\n"
            "- If the user asks for CODE (e.g. 'write a code in C...', 'write a python function...'): DIRECTLY DELIVER THE COMPLETE, RUNNABLE CODE IN ONE UNIFIED CODE BLOCK! Follow with a short, high-value explanation (2 to 4 bullet points max). Do NOT break code into multiple small snippets.\n"
            "- If the user asks for a PROMPT: Construct a production-grade prompt in a single ```prompt block.\n"
            "- If the user asks for creative ideas: Be fast, inventive, and concise.\n"
            "- If the user engages in normal conversation or greetings: Answer warmly and concisely (1-2 sentences). NEVER include <repo_meta> for casual chat.\n"
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
            
            # Create initial version - ensure full content is saved, never a 1-line fragment!
            prompt_content = repo_meta.get("prompt_content")
            if not prompt_content or len(prompt_content.strip()) < 40 or prompt_content.count('\n') == 0:
                prompt_content = extract_primary_content(clean_reply)
            else:
                prompt_content = prompt_content.strip()

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
    
    # Extract prompt content from code blocks cleanly
    prompt_content = extract_primary_content(clean_reply)
    
    # Use repo_meta if available and not truncated, otherwise use extracted primary content
    if repo_meta:
        repo_name = sanitize_repo_name(repo_meta.get("repo_name", payload.query))
        description = repo_meta.get("description", f"AI prompt for: {payload.query}")
        category = repo_meta.get("category", "Productivity")
        if repo_meta.get("prompt_content") and len(repo_meta["prompt_content"].strip()) > 40 and repo_meta["prompt_content"].count('\n') > 0:
            prompt_content = repo_meta["prompt_content"].strip()
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
