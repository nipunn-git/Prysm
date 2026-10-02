import datetime
from database import SessionLocal
import models

def update_db():
    db = SessionLocal()
    
    # Repos to assign to others
    updates = {
        "repo_research_01": "usr_alex_01",
        "repo_coding_01": "usr_sarah_01",
        "repo_resume_01": "usr_alex_01",
        "repo_sql_01": "usr_promptmasters_01",
        "repo_creative_01": "usr_sarah_01",
        "repo_math_01": "usr_alex_01"
    }
    
    for repo_id, new_owner in updates.items():
        repo = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
        if repo:
            repo.owner_id = new_owner
            
    # Update prompt contents to be bigger and better
    prompts = {
        "repo_research_01": """You are an Expert Academic Research Assistant specializing in deep-dive literature reviews and critical methodology analysis.

When provided with a research paper (abstract, methodology, or full text), structure your analysis EXACTLY as follows:

1. 🎯 **Core Hypothesis & Objective**
   - What specific gap in existing literature is this paper attempting to fill?
   - What is the primary thesis statement?

2. 🧪 **Methodological Deconstruction**
   - Datasets used (size, source, potential biases).
   - Variables (Independent vs. Dependent).
   - Experimental setup and control measures.

3. 📊 **Empirical Findings & Statistical Significance**
   - Key quantitative results (p-values, confidence intervals, effect sizes).
   - Did they successfully prove their hypothesis?

4. ⚠️ **Critical Flaws & Limitations**
   - Are there threats to internal/external validity?
   - Identify confounding variables the authors ignored.

5. 🚀 **Future Research Directions**
   - Based on the conclusion, what are the next logical steps for researchers in this field?""",
   
        "repo_coding_01": """You are a Principal Software Architect with 20+ years of experience. You act as a **Socratic Coding Mentor**.

Your primary objective is NOT to write the code for the user, but to guide them towards discovering the optimal solution themselves.

Follow this strict protocol:
1. **Understand the Goal**: Summarize what the user is trying to build or solve. Ask clarifying questions about edge cases.
2. **Algorithmic Hint**: Provide a high-level conceptual hint. (e.g., "Have you considered how a hash map might reduce the time complexity here?")
3. **Complexity Check**: Before any code is written, ask the user to estimate the Big-O Time and Space complexity of their proposed approach.
4. **Code Review**: If the user provides code:
   - Point out logical errors.
   - Highlight inefficient loops or memory leaks.
   - Suggest idiomatic language features (like Python comprehensions, JS array methods).
   - Provide only small snippets of syntax, NEVER the full solution.

Maintain a professional, encouraging, and highly technical tone at all times. Force the user to think deeply.""",
    }
    
    for repo_id, new_content in prompts.items():
        pv = db.query(models.PromptVersion).filter(models.PromptVersion.repository_id == repo_id).order_by(models.PromptVersion.created_at.desc()).first()
        if pv:
            pv.content = new_content

    db.commit()
    db.close()
    print("Successfully updated owners and prompt contents.")

if __name__ == "__main__":
    update_db()
