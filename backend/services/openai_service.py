import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

def optimize_prompt(prompt_text: str, custom_instructions: str = "") -> dict:
    load_dotenv(override=True)
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    system_prompt = """You are an expert prompt engineer. Your task is to analyze and optimize the user's prompt.
Specifically, your goal is to make the prompt **MORE EFFICIENT AND SMALLER** so that it consumes **fewer tokens/credits** while accomplishing the exact same work.
Improve the prompt in terms of:
1. Token Efficiency: Condense verbose phrasing and remove unnecessary filler words.
2. Clarity & Precision: Use exact, impactful words rather than long descriptions.
3. Strict Boundaries & Structure: Maintain the original constraints and format in the most compact way possible.
4. Elimination of Redundancy: Remove repeated instructions.

Return your response ONLY as a JSON object with two keys:
1. "improved_prompt": string containing the complete rewritten prompt formatted cleanly with Markdown.
2. "changes": array of concise bullet point strings explaining what was changed and why.

Do NOT include any markdown code block wrap outside the JSON object. Output raw JSON only.
"""

    user_msg = f"Prompt to optimize:\n{prompt_text}"
    if custom_instructions:
        user_msg += f"\n\nAdditional instructions: {custom_instructions}"

    # 1. Try Gemini (primary)
    if gemini_key and gemini_key.strip():
        for model_name in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel(
                    model_name,
                    generation_config={"response_mime_type": "application/json"}
                )
                prompt = f"{system_prompt}\n\n{user_msg}"
                res = model.generate_content(prompt)
                cleaned = res.text.strip()
                if cleaned.startswith("```"):
                    cleaned = re.sub(r"^```[a-zA-Z]*\n", "", cleaned)
                    cleaned = re.sub(r"\n```$", "", cleaned)
                parsed = json.loads(cleaned)
                print(f"[Prysm Optimizer] Successfully optimized using {model_name}")
                return {
                    "improved_prompt": parsed.get("improved_prompt", prompt_text),
                    "changes": parsed.get("changes", ["Enhanced prompt structure and clarity"])
                }
            except Exception as e:
                print(f"[Prysm Optimizer] Gemini {model_name} error: {e}")

    # 2. Try OpenAI (fallback)
    if openai_key and openai_key != "your_openai_api_key_here":
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            parsed = json.loads(content)
            return {
                "improved_prompt": parsed.get("improved_prompt", prompt_text),
                "changes": parsed.get("changes", ["Enhanced prompt structure and clarity"])
            }
        except Exception as e:
            print(f"[Prysm Optimizer] OpenAI error, falling back to built-in: {e}")

    # 3. High-quality fallback prompt optimization engine
    lines = [line.strip() for line in prompt_text.split('\n') if line.strip()]
    
    # Analyze existing prompt attributes
    has_role = any("role" in line.lower() or "you are" in line.lower() or "act as" in line.lower() for line in lines)
    has_output_fmt = any("format" in line.lower() or "output" in line.lower() or "json" in line.lower() or "markdown" in line.lower() for line in lines)
    has_constraints = any("do not" in line.lower() or "constraint" in line.lower() or "limit" in line.lower() or "avoid" in line.lower() for line in lines)

    improved_parts = []
    changes = []

    if not has_role:
        improved_parts.append("### Role & Persona\nYou are an expert AI specialist and subject matter expert dedicated to producing clear, accurate, and structured results.")
        changes.append("Added explicit expert role definition and clear persona context")
    else:
        changes.append("Refined existing role definition for maximum authority and tone alignment")

    improved_parts.append("### Task Objective\n" + (prompt_text.strip() if prompt_text.strip() else "Analyze the provided input comprehensively and generate high-value actionable insights."))
    changes.append("Structured main task objective into explicit sections with clear hierarchy")

    if not has_constraints:
        improved_parts.append("### Key Constraints\n- Ensure technical accuracy and omit unsupported assumptions.\n- Maintain concise, professional language without generic filler.\n- Explicitly highlight any edge cases or critical caveats.")
        changes.append("Added essential operational constraints (accuracy, conciseness, edge case handling)")

    if not has_output_fmt:
        improved_parts.append("### Expected Output Format\nProvide the response cleanly organized with standard Markdown headings, concise bullet points for actionable recommendations, and a brief executive summary at the start.")
        changes.append("Defined explicit output formatting rules (Markdown headings, structured executive summary)")

    improved_prompt_str = "\n\n".join(improved_parts)
    
    if custom_instructions:
        improved_prompt_str += f"\n\n### Additional Directive\n{custom_instructions}"
        changes.append(f"Incorporated custom instruction: '{custom_instructions}'")

    return {
        "improved_prompt": improved_prompt_str,
        "changes": changes
    }
