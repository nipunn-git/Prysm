import datetime
from database import SessionLocal, engine, Base
import models

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    now = datetime.datetime.utcnow()

    # 1. Users
    users_data = [
        {
            "id": "usr_nipun_01",
            "username": "nipunndhiman",
            "name": "Nipun Dhiman",
            "email": "nipun@prompthub.dev",
            "avatar": "https://avatars.githubusercontent.com/u/9919?s=40&v=4"
        },
        {
            "id": "usr_alex_01",
            "username": "alex-chen",
            "name": "Alex Chen",
            "email": "alex@prompthub.dev",
            "avatar": "https://avatars.githubusercontent.com/u/1024025?s=40&v=4"
        },
        {
            "id": "usr_sarah_01",
            "username": "sarah-dev",
            "name": "Sarah Miller",
            "email": "sarah@prompthub.dev",
            "avatar": "https://avatars.githubusercontent.com/u/20858568?s=40&v=4"
        },
        {
            "id": "usr_promptmasters_01",
            "username": "prompt-masters",
            "name": "Prompt Masters",
            "email": "masters@prompthub.dev",
            "avatar": "https://avatars.githubusercontent.com/u/69631?s=40&v=4"
        }
    ]

    for u in users_data:
        existing = db.query(models.User).filter(models.User.id == u["id"]).first()
        if not existing:
            # Also check by username
            existing_by_uname = db.query(models.User).filter(models.User.username == u["username"]).first()
            if not existing_by_uname:
                user_obj = models.User(
                    id=u["id"],
                    username=u["username"],
                    password_hash="password",
                    name=u["name"],
                    email=u["email"],
                    avatar=u["avatar"]
                )
                db.add(user_obj)
                db.commit()

    # 2. Helper to add repo and prompt versions
    def ensure_repo(repo_id, owner_id, name, desc, category, visibility, versions):
        r = db.query(models.Repository).filter(models.Repository.id == repo_id).first()
        if not r:
            r = models.Repository(
                id=repo_id,
                owner_id=owner_id,
                name=name,
                description=desc,
                category=category,
                visibility=visibility,
                created_at=now - datetime.timedelta(days=7),
                updated_at=now - datetime.timedelta(hours=2)
            )
            db.add(r)
            db.commit()

            for v in versions:
                pv = models.PromptVersion(
                    id=v["id"],
                    repository_id=repo_id,
                    version=v["version"],
                    content=v["content"],
                    change_description=v.get("change_description", "Updated prompt"),
                    created_at=v.get("created_at", now - datetime.timedelta(days=1))
                )
                db.add(pv)
            db.commit()

    # Repository 1: research-assistant
    ensure_repo(
        repo_id="repo_research_01",
        owner_id="usr_alex_01",
        name="research-assistant",
        desc="AI prompt for analyzing academic research papers with publication-ready output formatting.",
        category="Research",
        visibility="Public",
        versions=[
            {
                "id": "v_res_10",
                "version": "v1.0",
                "content": "You are a research assistant.\n\nAnalyze the provided research paper and summarize:\n1. Topic\n2. Key points",
                "change_description": "Initial prompt"
            },
            {
                "id": "v_res_13",
                "version": "v1.3",
                "content": """You are an expert research assistant specializing in systematic academic literature review.

Analyze the provided research paper and identify:

1. Research Question & Core Hypothesis: What specific gap does this paper address?
2. Methodology, Dataset & Experimental Controls: Identify sample size, controls, and benchmark datasets.
3. Key Empirical Findings: Summarize quantitative metrics (p-values, F1 score, effect sizes).
4. Critical Limitations & Methodological Flaws: Highlight threats to internal/external validity.
5. Future Research Opportunities: Extract open questions mentioned by the authors.

Return the analysis in a structured, publication-ready Markdown format with bullet points.""",
                "change_description": "Added research limitations section & empirical validation rules"
            }
        ]
    )

    # Repository 2: coding-tutor
    ensure_repo(
        repo_id="repo_coding_01",
        owner_id="usr_sarah_01",
        name="coding-tutor",
        desc="Senior Software Architect acting as a Socratic Coding Tutor with time and space complexity rules.",
        category="Coding",
        visibility="Public",
        versions=[
            {
                "id": "v_cod_20",
                "version": "v2.0",
                "content": """You are a Senior Software Architect acting as a Socratic Coding Tutor.

Your goal is to guide students to understand concepts deeply without directly pasting full solution code immediately.

Follow this flow:
1. Problem Clarification: Ensure student understands input/output constraints.
2. Conceptual Hint: Provide a high-level conceptual nudge.
3. Time & Space Complexity: Ask the student to analyze the Big-O complexity.
4. Code Review: If student posts code, highlight bugs with clear explanations rather than rewriting everything.

Rules:
- Keep responses encouraging and professional.
- Use Python/TypeScript code snippets only for syntax examples.""",
                "change_description": "Major upgrade: Socratic teaching method & complexity analysis rules"
            }
        ]
    )

    # Repository 3: resume-analyzer
    ensure_repo(
        repo_id="repo_resume_01",
        owner_id="usr_alex_01",
        name="resume-analyzer",
        desc="ATS resume scanner and action-oriented feedback generator for engineering roles.",
        category="Writing",
        visibility="Public",
        versions=[
            {
                "id": "v_resm_10",
                "version": "v1.0",
                "content": """You are an experienced Tech Recruiter and Resume Coach.

Review the attached resume for a Software Engineer role and provide:
1. Overall score out of 100
2. Top 3 strengths
3. Top 3 areas for improvement
4. Impact verb audit (e.g. replacing 'worked on' with 'engineered' or 'spearheaded')""",
                "change_description": "Saved version v1.0 of resume-analyzer"
            }
        ]
    )

    # Repository 4: sql-query-generator
    ensure_repo(
        repo_id="repo_sql_01",
        owner_id="usr_promptmasters_01",
        name="sql-query-generator",
        desc="Translates natural language questions into safe, performant SQL queries with schema guards.",
        category="Database",
        visibility="Public",
        versions=[
            {
                "id": "v_sql_10",
                "version": "v1.0",
                "content": """You are a Database Engineer. Convert user natural language requests into PostgreSQL queries given table schemas.
Rules:
- Always use explicit JOIN syntax (INNER JOIN, LEFT JOIN).
- Provide performance indexing recommendations where applicable.
- Prevent destructive queries (DROP, DELETE, ALTER).""",
                "change_description": "Initial prompt release"
            }
        ]
    )

    # Repository 5: chain-of-thought-reasoner (Alex Chen)
    ensure_repo(
        repo_id="repo_cot_01",
        owner_id="usr_alex_01",
        name="chain-of-thought-reasoner",
        desc="Production-ready few-shot reasoning prompts with self-consistency checks for complex mathematical derivations and algorithmic logic.",
        category="Reasoning",
        visibility="Public",
        versions=[
            {
                "id": "v_cot_10",
                "version": "v1.0",
                "content": "You are a logic engine. Think step by step before answering.",
                "change_description": "v1.0 baseline"
            },
            {
                "id": "v_cot_24",
                "version": "v2.4",
                "content": """You are an Advanced Mathematical & Algorithmic Reasoning Engine.

When presented with a complex problem, theorem proof, or algorithmic challenge, adhere strictly to this reasoning protocol:

### Phase 1: Problem Formulation
- Restate the inputs, outputs, invariants, and edge cases (e.g., n=0, negative numbers, overflow).
- Explicitly identify the objective function and any constraints.

### Phase 2: Systematic Deconstruction
- Decompose the problem into modular lemmas or sub-tasks.
- Write down formal mathematical equations or state transitions.

### Phase 3: Step-by-Step Derivation & Verification
- Execute each deduction step explicitly. Do NOT skip intermediate arithmetic or logical leaps.
- Run a self-consistency check on intermediate results.

### Phase 4: Final Answer
- State the final conclusion in a clean, unambiguous format enclosed in a boxed markdown callout.""",
                "change_description": "v2.4: Added Phase 3 self-consistency validation & formal bounds"
            }
        ]
    )

    # Repository 6: fullstack-code-reviewer (Sarah Miller)
    ensure_repo(
        repo_id="repo_reviewer_01",
        owner_id="usr_sarah_01",
        name="fullstack-code-reviewer",
        desc="Socratic software engineering mentor prompt that performs automated security audits, clean code refactoring, and AST complexity checks.",
        category="Coding",
        visibility="Public",
        versions=[
            {
                "id": "v_rev_10",
                "version": "v1.0",
                "content": """You are a Principal Software Engineer and Staff Security Auditor.

Review the submitted pull request / code snippet using this 4-tier rubric:

1. **Security & Vulnerability Audit**:
   - Check for SQL/NoSQL injection, XSS, CSRF, and unsafe deserialization.
   - Verify proper authorization checks, rate limiting, and zero secrets exposure.

2. **Algorithmic Efficiency & Resource Management**:
   - Calculate Big-O time and space complexity.
   - Detect N+1 database queries, unclosed connections, and memory retention leaks.

3. **Software Craftsmanship & Modularity**:
   - Adhere to SOLID principles, DRY, and high cohesion with loose coupling.
   - Flag poorly named identifiers or functions exceeding single-responsibility bounds.

4. **Concrete Recommendations**:
   - Provide refactored code snippets with line-by-line rationale.""",
                "change_description": "Initial publication of 4-tier code review prompt"
            }
        ]
    )

    # Repository 7: text-to-sql-pipeline (Prompt Masters)
    ensure_repo(
        repo_id="repo_pipeline_01",
        owner_id="usr_promptmasters_01",
        name="text-to-sql-pipeline",
        desc="Translates natural language questions into safe, performant PostgreSQL queries with schema guards and EXPLAIN plan auditing.",
        category="Database",
        visibility="Public",
        versions=[
            {
                "id": "v_pipe_21",
                "version": "v2.1",
                "content": """You are an Enterprise Database Architect and SQL Optimization Specialist.

Given a database schema DDL and a user analytical question:

1. **Schema Contextualization**:
   - Map foreign key relationships and index availability.
   - Check column data types and timezone constraints.

2. **Query Synthesis Guidelines**:
   - Use standard ANSI/PostgreSQL SQL.
   - Favor Common Table Expressions (WITH clauses) over deeply nested subqueries for readability.
   - NEVER generate non-SELECT queries unless explicitly commanded with an admin bypass token.

3. **Performance Analysis**:
   - Include an estimated EXPLAIN cost analysis.
   - Recommend composite indexes if table scans are inevitable.""",
                "change_description": "v2.1: Added CTE preference and EXPLAIN plan cost analysis"
            }
        ]
    )

    db.close()

    # Add a few more good ones
    ensure_repo(
        repo_id="repo_creative_01",
        owner_id="usr_sarah_01",
        name="creative-story-writer",
        desc="Crafts engaging fictional stories with deep character arcs.",
        category="Writing",
        visibility="Public",
        versions=[
            {
                "id": "v_story_10",
                "version": "v1.0",
                "content": "You are a master storyteller. Create vivid characters, build engaging worlds, and deliver gripping narratives. Ensure to pace the story appropriately.",
                "change_description": "Initial story prompt"
            }
        ]
    )

    ensure_repo(
        repo_id="repo_math_01",
        owner_id="usr_alex_01",
        name="math-tutor-bot",
        desc="A patient math tutor that helps students understand concepts instead of giving answers.",
        category="Education",
        visibility="Public",
        versions=[
            {
                "id": "v_math_10",
                "version": "v1.0",
                "content": "You are an expert Math teacher. Do not give the final answer directly. Ask guiding questions, break down the logic, and lead the student to solve it themselves.",
                "change_description": "v1.0 math tutor"
            }
        ]
    )

if __name__ == "__main__":
    seed_data()
    print("Database seeded with all 7 prompt repositories!")
