import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

SYSTEM_INSTRUCTION = """You are Prysm, a world-class Prompt Engineer and Architect on Prysm.
Given a user's prompt idea or request, you must synthesize a production-ready, highly effective AI system prompt and generate repository metadata.

You must respond ONLY with valid JSON in this exact structure:
{
  "repo_name": "kebab-case-repo-name",
  "description": "Concise 1-2 sentence description of what this prompt does",
  "category": "Coding" | "Research" | "Education" | "Writing" | "Productivity" | "Database",
  "prompt_content": "The complete, production-grade system prompt with clear Markdown headings (Role, Objective, Workflow/Rules, Constraints, Output Format)"
}

Do NOT wrap the response in markdown code blocks like ```json ... ```. Output raw JSON only.
"""

def generate_prompt_and_repo_metadata(query: str, action_type: str = "custom") -> dict:
    """
    Synthesize prompt and repository metadata using Groq, Gemini, OpenAI, or intelligent fallback.
    """
    load_dotenv(override=True)
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    # 1. Try Google Gemini (User's primary AI provider)
    if gemini_key and gemini_key.strip():
        for model_name in ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro"]:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel(
                    model_name,
                    generation_config={"response_mime_type": "application/json"}
                )
                prompt = f"{SYSTEM_INSTRUCTION}\n\nUser Prompt Request (Mode: {action_type}): {query}"
                res = model.generate_content(prompt)
                parsed = clean_and_parse_json(res.text, query)
                if parsed and parsed.get("prompt_content"):
                    print(f"[Prysm AI] Successfully synthesized prompt using {model_name}")
                    return parsed
            except Exception as e:
                print(f"[Prysm AI] Gemini {model_name} error: {e}")

    # 2. Try Groq (Fast & Free)
    if groq_key and groq_key != "your_groq_api_key_here":
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_INSTRUCTION},
                    {"role": "user", "content": f"User Prompt Request (Mode: {action_type}): {query}"}
                ],
                temperature=0.4,
                response_format={"type": "json_object"}
            )
            content = completion.choices[0].message.content
            return clean_and_parse_json(content, query)
        except Exception as e:
            print(f"[Prysm AI] Groq API error: {e}")

    # 3. Try OpenAI
    if openai_key and openai_key != "your_openai_api_key_here":
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_INSTRUCTION},
                    {"role": "user", "content": f"User Prompt Request (Mode: {action_type}): {query}"}
                ],
                temperature=0.4,
                response_format={"type": "json_object"}
            )
            content = completion.choices[0].message.content
            return clean_and_parse_json(content, query)
        except Exception as e:
            print(f"[Prysm AI] OpenAI API error: {e}")

    # 4. Fallback Rule-Based Intelligent Prompt Architect
    return fallback_prompt_generator(query, action_type)


def clean_and_parse_json(text: str, original_query: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
    try:
        data = json.loads(cleaned)
        return {
            "repo_name": sanitize_repo_name(data.get("repo_name", original_query)),
            "description": data.get("description", f"AI prompt for: {original_query}"),
            "category": data.get("category", "Productivity"),
            "prompt_content": data.get("prompt_content", original_query)
        }
    except Exception as e:
        print(f"JSON parsing error: {e}, falling back to intelligent template")
        return fallback_prompt_generator(original_query)


def sanitize_repo_name(raw: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", "", raw).strip().lower()
    cleaned = re.sub(r"[\s_]+", "-", cleaned)
    parts = cleaned.split("-")[:5] # Limit length
    result = "-".join(parts)
    return result if result else "ai-prompt"


def fallback_prompt_generator(query: str, action_type: str = "custom") -> dict:
    slug = sanitize_repo_name(query)
    
    # Infer category
    q_lower = query.lower()
    if any(k in q_lower for k in ["code", "sql", "bug", "python", "js", "ts", "react", "api"]):
        category = "Coding"
    elif any(k in q_lower for k in ["research", "paper", "study", "analysis", "academic"]):
        category = "Research"
    elif any(k in q_lower for k in ["teach", "tutor", "learn", "course", "explain"]):
        category = "Education"
    elif any(k in q_lower for k in ["write", "essay", "blog", "copy", "email", "resume"]):
        category = "Writing"
    elif any(k in q_lower for k in ["sql", "database", "postgres", "query"]):
        category = "Database"
    else:
        category = "Productivity"

    title_words = " ".join(slug.split("-")).title()

    prompt_content = f"""# System Prompt: {title_words}

You are an expert AI specialist designed specifically for **{query}**.

---

### 1. Role & Persona
- You operate as an elite subject matter specialist with deep contextual understanding.
- Tone: Professional, structured, direct, and actionable. Avoid unnecessary conversational fluff.

### 2. Primary Objective
Execute the following mission with maximum precision:
> **{query}**

### 3. Step-by-Step Execution Protocol
1. **Context & Requirement Ingestion**: Analyze input constraints, domain variables, and requirements.
2. **Deconstruction & Planning**: Break down multi-step tasks into clear, logical milestones.
3. **Execution & Synthesis**: Deliver the highest quality output adhering to domain best practices.
4. **Validation & Edge Checking**: Verify accuracy, completeness, and edge case safety.

### 4. Critical Constraints & Negative Directives
- **Zero Hallucination**: Omit speculative claims unless explicitly marked as assumptions.
- **Conciseness**: Prioritize signal-to-noise ratio.
- **Safety & Robustness**: Never generate destructive actions or unvalidated inputs.

### 5. Expected Output Format
Deliver your response using clean Markdown hierarchy:
- High-level executive summary / direct answer
- Structured sections with bullet points
- Explicit code blocks or data tables where applicable
"""

    return {
        "repo_name": slug,
        "description": f"AI prompt repository for {query}.",
        "category": category,
        "prompt_content": prompt_content.strip()
    }
